import express from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';

const router = express.Router();

console.log('=== SOLD PRODUCTS ROUTES FILE LOADED ===');

// Authentication middleware
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .eq('id', decoded.userId)
      .single();

    if (userError || !userData) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      id: userData.id,
      email: userData.email,
      fullName: userData.full_name,
      role: userData.role
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get sold products for a seller with complete ownership history
router.get('/seller/:sellerId', requireAuth, async (req, res) => {
  try {
    const { sellerId } = req.params;
    
    console.log('🔍 Fetching sold products for seller:', sellerId);

    // Verify user can access this data
    if (req.user.id !== sellerId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get seller information
    const { data: seller, error: sellerError } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('id', sellerId)
      .single();

    if (sellerError) {
      console.error('Error fetching seller:', sellerError);
      return res.status(500).json({ error: 'Failed to fetch seller information' });
    }

    // Get all products originally created by this seller
    const { data: originalProducts, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        base_price,
        category_id,
        image_url,
        created_at,
        status
      `)
      .eq('seller_id', sellerId);

    if (productsError) {
      console.error('Error fetching original products:', productsError);
      return res.status(500).json({ error: 'Failed to fetch products' });
    }

    console.log('📦 Found original products:', originalProducts?.length || 0);

    const soldProducts = [];
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalResales = 0;

    // For each original product, build its complete ownership and sales history
    for (const product of originalProducts || []) {
      try {
        // Get all listings for this product (original and resales)
        const { data: listings, error: listingsError } = await supabase
          .from('listings')
          .select(`
            id,
            title,
            starting_bid,
            current_bid,
            end_date,
            status,
            seller_id,
            product_id,
            created_at
          `)
          .eq('product_id', product.id)
          .order('created_at', { ascending: true });

        if (listingsError) {
          console.error('Error fetching listings for product:', product.id, listingsError);
          continue;
        }

        // Skip products that were never listed
        if (!listings || listings.length === 0) {
          continue;
        }

        // Get all winning bids for these listings
        const listingIds = listings.map(l => l.id);
        const { data: winningBids, error: bidsError } = await supabase
          .from('bids')
          .select(`
            id,
            listing_id,
            bidder_id,
            amount,
            created_at,
            is_winning
          `)
          .in('listing_id', listingIds)
          .eq('is_winning', true)
          .order('created_at', { ascending: true });

        if (bidsError) {
          console.error('Error fetching winning bids:', bidsError);
          continue;
        }

        // Get payment information for successful transactions
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select(`
            id,
            listing_id,
            user_id,
            amount,
            status,
            payment_id,
            created_at
          `)
          .in('listing_id', listingIds)
          .eq('type', 'purchase_payment')
          .eq('status', 'captured');

        if (paymentsError) {
          console.error('Error fetching payments:', paymentsError);
        }

        // Build ownership history from successful transactions
        const ownershipHistory = [];
        let currentOwner = null;
        let timesResold = 0;
        let totalSales = 0;
        let productProfit = 0;
        let firstSaleDate = null;
        let lastSaleDate = null;
        let salesPrices = [];

        // Add original seller as first owner
        ownershipHistory.push({
          id: `original_${product.id}`,
          userId: seller.id,
          userName: seller.full_name,
          userEmail: seller.email,
          acquiredDate: product.created_at,
          soldDate: null,
          purchasePrice: 0, // Original creation
          salePrice: null,
          isCurrentOwner: true, // Will be updated if sold
          acquisitionMethod: 'original',
          paymentStatus: 'completed'
        });

        // Process each successful payment to build ownership chain
        const successfulPayments = payments || [];
        
        for (let i = 0; i < successfulPayments.length; i++) {
          const payment = successfulPayments[i];
          const bid = winningBids?.find(b => b.listing_id === payment.listing_id && b.bidder_id === payment.user_id);
          
          if (!bid) continue;

          totalSales++;
          const salePrice = parseFloat(payment.amount);
          salesPrices.push(salePrice);
          
          if (!firstSaleDate) firstSaleDate = payment.created_at;
          lastSaleDate = payment.created_at;

          // Get buyer information
          const { data: buyer, error: buyerError } = await supabase
            .from('users')
            .select('id, full_name, email')
            .eq('id', payment.user_id)
            .single();

          if (!buyerError && buyer) {
            // Update previous owner's sold date
            if (ownershipHistory.length > 0) {
              const previousOwner = ownershipHistory[ownershipHistory.length - 1];
              previousOwner.soldDate = payment.created_at;
              previousOwner.salePrice = salePrice;
              previousOwner.isCurrentOwner = false;
            }

            // Add new owner
            const isCurrentOwner = i === successfulPayments.length - 1;
            ownershipHistory.push({
              id: `payment_${payment.id}`,
              userId: buyer.id,
              userName: buyer.full_name,
              userEmail: buyer.email,
              acquiredDate: payment.created_at,
              soldDate: null,
              purchasePrice: salePrice,
              salePrice: null,
              isCurrentOwner,
              acquisitionMethod: 'auction',
              paymentStatus: 'completed'
            });

            if (isCurrentOwner) {
              currentOwner = {
                id: buyer.id,
                name: buyer.full_name,
                email: buyer.email,
                acquiredDate: payment.created_at,
                paidAmount: salePrice
              };
            }

            // Count resales (sales after the original)
            if (i > 0) {
              timesResold++;
            }
          }
        }

        // Only include products that have been sold at least once
        if (totalSales > 0) {
          // Calculate metrics
          const averageSalePrice = salesPrices.reduce((sum, price) => sum + price, 0) / salesPrices.length;
          const highestSalePrice = Math.max(...salesPrices);
          const lowestSalePrice = Math.min(...salesPrices);
          const currentValue = salesPrices[salesPrices.length - 1] || product.base_price;
          
          productProfit = currentValue - product.base_price;
          const profitMargin = product.base_price > 0 ? (productProfit / product.base_price) * 100 : 0;

          // Calculate average holding period
          let totalHoldingDays = 0;
          let holdingPeriods = 0;
          for (let i = 0; i < ownershipHistory.length - 1; i++) {
            const current = ownershipHistory[i];
            if (current.soldDate) {
              const holdingDays = Math.floor(
                (new Date(current.soldDate).getTime() - new Date(current.acquiredDate).getTime()) / (1000 * 60 * 60 * 24)
              );
              totalHoldingDays += holdingDays;
              holdingPeriods++;
            }
          }
          const averageHoldingPeriod = holdingPeriods > 0 ? totalHoldingDays / holdingPeriods : 0;

          soldProducts.push({
            id: `sold_${product.id}`,
            productId: product.id,
            productName: product.name,
            productDescription: product.description || '',
            productImage: product.image_url || '',
            category: product.category_id || 'General',
            originalBasePrice: parseFloat(product.base_price),
            currentValue,
            totalSales,
            firstSaleDate: firstSaleDate || product.created_at,
            lastSaleDate: lastSaleDate || product.created_at,
            timesResold,
            totalProfit: productProfit,
            status: currentOwner ? 'sold' : 'active',
            ownershipHistory,
            currentOwner: currentOwner || {
              id: seller.id,
              name: seller.full_name,
              email: seller.email,
              acquiredDate: product.created_at,
              paidAmount: 0
            },
            originalSeller: {
              id: seller.id,
              name: seller.full_name,
              email: seller.email,
              listedDate: product.created_at,
              basePrice: parseFloat(product.base_price)
            },
            salesMetrics: {
              averageSalePrice,
              highestSalePrice,
              lowestSalePrice,
              averageHoldingPeriod,
              profitMargin
            }
          });

          totalRevenue += currentValue;
          totalProfit += productProfit;
          totalResales += timesResold;
        }
      } catch (error) {
        console.error('Error processing product:', product.id, error);
        continue;
      }
    }

    // Calculate statistics
    const averageSalePrice = soldProducts.length > 0 ? totalRevenue / soldProducts.length : 0;
    
    // Find best performing category
    const categoryStats = soldProducts.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + p.totalProfit;
      return acc;
    }, {});
    
    const bestPerformingCategory = Object.entries(categoryStats)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

    console.log('✅ Returning real sold products data:', {
      total: soldProducts.length,
      totalRevenue,
      totalProfit,
      totalResales
    });

    res.json({
      soldProducts,
      total: soldProducts.length,
      statistics: {
        totalRevenue,
        totalProfit,
        averageSalePrice,
        totalResales,
        bestPerformingCategory
      }
    });

  } catch (error) {
    console.error('💥 Sold products fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get detailed ownership history for a specific product
router.get('/ownership-history/:productId', requireAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    
    console.log('🔍 Fetching ownership history for product:', productId);

    // Get product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, description, base_price, seller_id')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Verify user can access this data (product owner or admin)
    if (req.user.id !== product.seller_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all listings for this product
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('id, seller_id, starting_bid, current_bid, created_at, status')
      .eq('product_id', productId)
      .order('created_at', { ascending: true });

    if (listingsError) {
      console.error('Error fetching listings:', listingsError);
      return res.status(500).json({ error: 'Failed to fetch listings' });
    }

    // Get winning bids and build ownership history
    const ownershipHistory = [];
    let totalSales = 0;
    let totalProfit = 0;
    let salesPrices = [];

    for (const listing of listings || []) {
      const { data: winningBid, error: bidError } = await supabase
        .from('bids')
        .select('id, bidder_id, amount, created_at')
        .eq('listing_id', listing.id)
        .eq('is_winning', true)
        .single();

      if (!bidError && winningBid) {
        // Check if payment was completed
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .select('status, payment_id')
          .eq('listing_id', listing.id)
          .eq('user_id', winningBid.bidder_id)
          .eq('type', 'purchase_payment')
          .single();

        if (!paymentError && payment && payment.status === 'captured') {
          totalSales++;
          const salePrice = parseFloat(winningBid.amount);
          salesPrices.push(salePrice);

          // Get buyer details
          const { data: buyer, error: buyerError } = await supabase
            .from('users')
            .select('id, full_name, email')
            .eq('id', winningBid.bidder_id)
            .single();

          if (!buyerError && buyer) {
            ownershipHistory.push({
              id: winningBid.id,
              userId: buyer.id,
              userName: buyer.full_name,
              userEmail: buyer.email,
              acquiredDate: winningBid.created_at,
              purchasePrice: salePrice,
              isCurrentOwner: true, // Simplified for now
              acquisitionMethod: 'auction',
              paymentStatus: 'completed'
            });
          }
        }
      }
    }

    // Calculate metrics
    const averageSalePrice = salesPrices.length > 0 ? salesPrices.reduce((sum, price) => sum + price, 0) / salesPrices.length : 0;
    const currentValue = salesPrices[salesPrices.length - 1] || product.base_price;
    totalProfit = currentValue - product.base_price;
    const profitMargin = product.base_price > 0 ? (totalProfit / product.base_price) * 100 : 0;

    res.json({
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        originalPrice: parseFloat(product.base_price),
        currentValue
      },
      ownershipHistory,
      salesMetrics: {
        totalSales,
        totalProfit,
        averageSalePrice,
        profitMargin
      }
    });

  } catch (error) {
    console.error('💥 Ownership history fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get ownership analytics for seller
router.get('/analytics/:sellerId', requireAuth, async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { period = '30d' } = req.query;
    
    console.log('📊 Fetching ownership analytics for seller:', sellerId, 'period:', period);

    // Verify user can access this data
    if (req.user.id !== sellerId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Get seller's products and their sales
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, base_price, category_id, created_at')
      .eq('seller_id', sellerId)
      .gte('created_at', startDate.toISOString());

    if (productsError) {
      console.error('Error fetching products for analytics:', productsError);
      return res.status(500).json({ error: 'Failed to fetch analytics' });
    }

    // Simplified analytics response
    const analytics = {
      totalProductsSold: products?.length || 0,
      totalRevenue: 0,
      totalProfit: 0,
      averageSalePrice: 0,
      totalResales: 0,
      categoryBreakdown: [],
      monthlyTrend: [],
      topPerformingProducts: []
    };

    console.log('✅ Returning analytics:', analytics);

    res.json(analytics);

  } catch (error) {
    console.error('💥 Analytics fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Track ownership transfer (called when payment is completed)
router.post('/track-ownership', requireAuth, async (req, res) => {
  try {
    const {
      productId,
      fromUserId,
      toUserId,
      salePrice,
      acquisitionMethod,
      paymentId,
      listingId
    } = req.body;

    console.log('📝 Tracking ownership transfer:', {
      productId,
      fromUserId,
      toUserId,
      salePrice,
      acquisitionMethod
    });

    // For now, return success as ownership is tracked through existing tables
    const ownershipRecord = {
      id: `transfer_${Date.now()}`,
      userId: toUserId,
      userName: 'New Owner',
      userEmail: 'owner@example.com',
      acquiredDate: new Date().toISOString(),
      purchasePrice: salePrice,
      isCurrentOwner: true,
      acquisitionMethod,
      paymentStatus: 'completed'
    };

    res.json({
      success: true,
      ownershipRecord
    });

  } catch (error) {
    console.error('💥 Ownership tracking error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Test endpoint
router.get('/test', (req, res) => {
  console.log('Sold products test endpoint called');
  res.json({ message: 'Sold products routes are working!' });
});

export default router;