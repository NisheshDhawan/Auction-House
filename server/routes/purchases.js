import express from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// Authentication middleware
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
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

// Get user's purchases (won auctions)
router.get('/user/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('🔍 Fetching purchases for user:', userId);

    // Get all winning bids for ended auctions
    const { data: winningBids, error: bidsError } = await supabase
      .from('bids')
      .select(`
        id,
        amount,
        created_at,
        listing_id,
        listings!listing_id (
          id,
          title,
          status,
          end_date,
          seller_id,
          product_id,
          users!seller_id (
            full_name
          ),
          products!product_id (
            id,
            name,
            image_url,
            category_id
          )
        )
      `)
      .eq('bidder_id', userId)
      .eq('is_winning', true);

    if (bidsError) {
      console.error('Error fetching winning bids:', bidsError);
      return res.status(500).json({ error: 'Failed to fetch user purchases' });
    }

    // Get payment records for this user
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('listing_id, status, payment_id, created_at')
      .eq('user_id', userId)
      .eq('type', 'purchase_payment');

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
    }

    // Create a map of paid listings
    const paidListings = new Map();
    if (payments) {
      payments.forEach(payment => {
        if (payment.status === 'captured' && payment.payment_id) {
          paidListings.set(payment.listing_id, payment);
        }
      });
    }

    // Process winning bids for ended auctions
    const purchases = winningBids
      .filter(bid => bid.listings?.status === 'ended')
      .map(bid => {
        const isPaid = paidListings.has(bid.listing_id);
        const paymentInfo = paidListings.get(bid.listing_id);
        
        console.log('Processing bid for purchases:', {
          bidId: bid.id,
          listingId: bid.listing_id,
          bidAmount: bid.amount,
          listingTitle: bid.listings?.title,
          isPaid,
          paymentId: paymentInfo?.payment_id
        });
        
        return {
          id: bid.id,
          userId: userId,
          listingId: bid.listing_id,
          productId: bid.listing_id, // Using listing_id as product reference
          productName: bid.listings?.products?.name || bid.listings?.title || 'Unknown Product',
          productImage: bid.listings?.products?.image_url || null,
          category: bid.listings?.products?.category_id || 'General',
          finalPrice: parseFloat(bid.amount),
          purchaseDate: bid.created_at,
          sellerName: bid.listings?.users?.full_name || 'Unknown Seller',
          auctionEndDate: bid.listings?.end_date,
          isPaid: isPaid,
          paymentId: paymentInfo?.payment_id || null
        };
      });

    // Sort by creation date (most recent first)
    purchases.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());

    console.log('✅ Returning purchases:', {
      total: purchases.length,
      paid: purchases.filter(p => p.isPaid).length,
      unpaid: purchases.filter(p => !p.isPaid).length
    });

    res.json({
      purchases: purchases,
      total: purchases.length
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get seller's purchases (items sold by this seller)
router.get('/seller/:sellerId', requireAuth, async (req, res) => {
  try {
    const { sellerId } = req.params;

    console.log('🔍 Fetching seller purchases for:', sellerId);

    // Get all winning bids for this seller's ended auctions
    const { data: sellerSales, error: salesError } = await supabase
      .from('bids')
      .select(`
        id,
        amount,
        created_at,
        listing_id,
        bidder_id,
        is_winning
      `)
      .eq('is_winning', true);

    if (salesError) {
      console.error('Error fetching seller sales:', salesError);
      return res.status(500).json({ error: 'Failed to fetch seller purchases' });
    }

    // Filter for this seller's listings and get additional data
    const sellerPurchases = [];
    
    for (const bid of sellerSales) {
      try {
        // Get listing details
        const { data: listing, error: listingError } = await supabase
          .from('listings')
          .select('id, title, status, end_date, seller_id')
          .eq('id', bid.listing_id)
          .eq('seller_id', sellerId)
          .single();

        if (listingError || !listing) {
          continue; // Skip if not this seller's listing
        }

        // Get buyer details
        const { data: buyer, error: buyerError } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', bid.bidder_id)
          .single();

        // Get payment status
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .select('status, payment_id, created_at, amount')
          .eq('listing_id', bid.listing_id)
          .eq('user_id', bid.bidder_id)
          .eq('type', 'purchase_payment')
          .single();

        const isPaid = payment && payment.status === 'captured' && payment.payment_id;

        sellerPurchases.push({
          id: bid.id,
          userId: bid.bidder_id,
          listingId: bid.listing_id,
          productId: bid.listing_id,
          productName: listing.title || 'Unknown Product',
          productImage: null,
          category: 'General',
          finalPrice: parseFloat(bid.amount),
          purchaseDate: bid.created_at,
          buyerName: buyer?.full_name || 'Unknown Buyer',
          auctionEndDate: listing.end_date,
          isPaid: isPaid,
          paymentId: payment?.payment_id || null,
          status: isPaid ? 'completed' : 'pending'
        });
      } catch (error) {
        console.error('Error processing bid:', bid.id, error);
        continue;
      }
    }

    // Sort by creation date (most recent first)
    sellerPurchases.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());

    console.log('✅ Returning seller purchases:', {
      total: sellerPurchases.length,
      paid: sellerPurchases.filter(p => p.isPaid).length,
      unpaid: sellerPurchases.filter(p => !p.isPaid).length
    });

    res.json({
      purchases: sellerPurchases,
      total: sellerPurchases.length
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a new purchase (when auction ends)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { listingId, productId, productName, category, finalPrice, sellerName, auctionEndDate } = req.body;
    const userId = req.user.id;

    // For now, we'll just return success since purchases are tracked through winning bids
    // In a real system, you might want to create a separate purchases table
    const purchase = {
      id: Date.now().toString(),
      userId,
      listingId,
      productId,
      productName,
      category,
      finalPrice,
      purchaseDate: new Date().toISOString(),
      sellerName,
      auctionEndDate
    };

    res.status(201).json(purchase);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;