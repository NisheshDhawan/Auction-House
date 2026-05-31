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
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Get comprehensive seller activity
router.get('/seller/:sellerId/activity', requireAuth, async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { limit = 15 } = req.query;
    
    console.log('🎯 Getting comprehensive seller activity for:', sellerId);
    
    const activities = [];
    const debugInfo = {
      productCount: 0,
      listingCount: 0,
      bidCount: 0,
      paymentCount: 0,
      purchaseCount: 0,
      errors: []
    };
    
    // 1. Get product activities
    try {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, base_price, status, created_at, updated_at')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (productsError) {
        console.error('❌ Error fetching products:', productsError);
        debugInfo.errors.push(`Products: ${productsError.message}`);
      } else if (products && products.length > 0) {
        debugInfo.productCount = products.length;
        console.log(`✅ Found ${products.length} products for seller ${sellerId}`);
        products.forEach(product => {
          // Product creation activity
          activities.push({
            id: `product-${product.id}`,
            type: 'product',
            subType: 'created',
            message: `Added ${product.name} to inventory`,
            timestamp: product.created_at,
            amount: product.base_price,
            relatedEntity: {
              id: product.id,
              name: product.name,
              type: 'product'
            },
            metadata: {
              status: product.status
            }
          });
          
          // Product status change activity (if updated recently)
          if (product.updated_at !== product.created_at && product.status === 'inactive') {
            activities.push({
              id: `product-status-${product.id}`,
              type: 'product',
              subType: 'deactivated',
              message: `Deactivated ${product.name}`,
              timestamp: product.updated_at,
              relatedEntity: {
                id: product.id,
                name: product.name,
                type: 'product'
              }
            });
          }
        });
        
        // Store products for comprehensive activities section
        debugInfo.productsData = products;
      } else {
        console.log('ℹ️ No products found for seller:', sellerId);
        debugInfo.productsData = [];
      }
    } catch (error) {
      console.error('❌ Products query failed:', error);
      debugInfo.errors.push(`Products query: ${error.message}`);
    }
    
    // 2. Get listing activities
    try {
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select(`
          id, 
          title, 
          starting_bid, 
          current_bid, 
          status, 
          created_at, 
          updated_at,
          end_date,
          winner_name
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (listingsError) {
        console.error('❌ Error fetching listings:', listingsError);
        debugInfo.errors.push(`Listings: ${listingsError.message}`);
      } else if (listings && listings.length > 0) {
        debugInfo.listingCount = listings.length;
        console.log(`✅ Found ${listings.length} listings for seller ${sellerId}`);
        
        // Process listings sequentially to handle async operations
        for (const listing of listings) {
          // Listing creation activity
          activities.push({
            id: `listing-${listing.id}`,
            type: 'listing',
            subType: 'created',
            message: `Listed ${listing.title} for auction`,
            timestamp: listing.created_at,
            amount: listing.starting_bid,
            relatedEntity: {
              id: listing.id,
              name: listing.title,
              type: 'listing'
            }
          });
          
          // Sale activity
          if (listing.status === 'sold') {
            activities.push({
              id: `sale-${listing.id}`,
              type: 'sale',
              subType: 'completed',
              message: `Sold ${listing.title} for ₹${listing.current_bid?.toLocaleString('en-IN')}`,
              timestamp: listing.updated_at,
              amount: listing.current_bid,
              relatedEntity: {
                id: listing.id,
                name: listing.title,
                type: 'listing'
              },
              metadata: {
                winner: listing.winner_name
              }
            });
            
            // Ownership transfer activity
            activities.push({
              id: `ownership-${listing.id}`,
              type: 'ownership',
              subType: 'transferred',
              message: `Ownership of ${listing.title} transferred to ${listing.winner_name || 'buyer'}`,
              timestamp: listing.updated_at,
              relatedEntity: {
                id: listing.id,
                name: listing.title,
                type: 'listing'
              },
              metadata: {
                newOwner: listing.winner_name
              }
            });
            
            // Payment received activity
            activities.push({
              id: `payment-${listing.id}`,
              type: 'payment',
              subType: 'received',
              message: `Payment received for ${listing.title} - ₹${listing.current_bid?.toLocaleString('en-IN')}`,
              timestamp: listing.updated_at,
              amount: listing.current_bid,
              relatedEntity: {
                id: listing.id,
                name: listing.title,
                type: 'listing'
              }
            });
          }
          
          // Bid activity for active auctions (get bid count separately)
          if (listing.status === 'active') {
            try {
              // Get bid count for this listing
              const { count: bidCount } = await supabase
                .from('bids')
                .select('*', { count: 'exact', head: true })
                .eq('listing_id', listing.id);
              
              if (bidCount > 0) {
                activities.push({
                  id: `bid-${listing.id}`,
                  type: 'bid',
                  subType: 'received',
                  message: `New bid received on ${listing.title} - ₹${listing.current_bid?.toLocaleString('en-IN')}`,
                  timestamp: listing.updated_at,
                  amount: listing.current_bid,
                  relatedEntity: {
                    id: listing.id,
                    name: listing.title,
                    type: 'listing'
                  },
                  metadata: {
                    totalBids: bidCount
                  }
                });
              }
            } catch (bidError) {
              console.error('Error fetching bid count for listing:', listing.id, bidError);
            }
          }
          
          // Auction ended activity
          if (listing.status === 'ended') {
            activities.push({
              id: `ended-${listing.id}`,
              type: 'listing',
              subType: 'ended',
              message: `Auction ended for ${listing.title}`,
              timestamp: listing.end_date || listing.updated_at,
              amount: listing.current_bid,
              relatedEntity: {
                id: listing.id,
                name: listing.title,
                type: 'listing'
              }
            });
          }
        }
        
        // Store listings for customer activities section
        debugInfo.listingsData = listings;
      } else {
        console.log('ℹ️ No listings found for seller:', sellerId);
        debugInfo.listingsData = [];
      }
    } catch (error) {
      console.error('❌ Listings query failed:', error);
      debugInfo.errors.push(`Listings query: ${error.message}`);
      debugInfo.listingsData = [];
    }
    
    // 3. Get bid activities from bids table
    const { data: bids, error: bidsError } = await supabase
      .from('bids')
      .select(`
        id,
        amount,
        created_at,
        listing_id,
        listings!inner(
          id,
          title,
          seller_id
        )
      `)
      .eq('listings.seller_id', sellerId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (bidsError) {
      console.error('Error fetching bids:', bidsError);
    } else if (bids && bids.length > 0) {
      console.log(`Found ${bids.length} bids for seller ${sellerId}`);
      bids.forEach(bid => {
        activities.push({
          id: `bid-detail-${bid.id}`,
          type: 'bid',
          subType: 'placed',
          message: `Bid of ₹${bid.amount?.toLocaleString('en-IN')} placed on ${bid.listings.title}`,
          timestamp: bid.created_at,
          amount: bid.amount,
          relatedEntity: {
            id: bid.listings.id,
            name: bid.listings.title,
            type: 'listing'
          }
        });
      });
    } else {
      console.log('No bids found for seller:', sellerId);
    }
    
    // 4. Get payment activities from payments table (if exists)
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        status,
        type,
        created_at,
        updated_at,
        listing_id
      `)
      .not('listing_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
    } else if (payments && payments.length > 0) {
      console.log(`Found ${payments.length} payments`);
      
      // Get listing details for payments
      for (const payment of payments) {
        if (payment.listing_id) {
          const { data: listing } = await supabase
            .from('listings')
            .select('id, title, seller_id')
            .eq('id', payment.listing_id)
            .eq('seller_id', sellerId)
            .single();
          
          if (listing) {
            activities.push({
              id: `payment-detail-${payment.id}`,
              type: 'payment',
              subType: payment.status,
              message: `Payment ${payment.status} for ${listing.title} - ₹${payment.amount?.toLocaleString('en-IN')}`,
              timestamp: payment.updated_at || payment.created_at,
              amount: payment.amount,
              relatedEntity: {
                id: listing.id,
                name: listing.title,
                type: 'payment'
              },
              metadata: {
                paymentType: payment.type,
                status: payment.status
              }
            });
          }
        }
      }
    } else {
      console.log('No payments found');
    }
    
    // 5. Get purchase activities
    const { data: purchases, error: purchasesError } = await supabase
      .from('purchases')
      .select(`
        id,
        final_price,
        created_at,
        product_name,
        seller_name
      `)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (purchasesError) {
      console.error('Error fetching purchases:', purchasesError);
    } else if (purchases && purchases.length > 0) {
      console.log(`Found ${purchases.length} purchases`);
      
      // Filter purchases for this seller (since we can't filter by seller_id directly)
      const sellerPurchases = purchases.filter(purchase => {
        // You might need to add seller_id to purchases table or use a different approach
        return true; // For now, include all purchases
      });
      
      sellerPurchases.forEach(purchase => {
        activities.push({
          id: `purchase-${purchase.id}`,
          type: 'sale',
          subType: 'completed',
          message: `Item sold: ${purchase.product_name} for ₹${purchase.final_price?.toLocaleString('en-IN')}`,
          timestamp: purchase.created_at,
          amount: purchase.final_price,
          relatedEntity: {
            id: purchase.id,
            name: purchase.product_name,
            type: 'purchase'
          }
        });
      });
    } else {
      console.log('No purchases found');
    }
    
    // 6. Get customer activities (new customers from sales)
    const uniqueCustomers = new Set();
    const customerActivities = (debugInfo.listingsData || [])
      .filter(listing => listing.status === 'sold' && listing.winner_name)
      .filter(listing => {
        if (uniqueCustomers.has(listing.winner_name)) return false;
        uniqueCustomers.add(listing.winner_name);
        return true;
      })
      .slice(0, 5)
      .map(listing => ({
        id: `customer-${listing.id}`,
        type: 'customer',
        subType: 'acquired',
        message: `New customer acquired: ${listing.winner_name}`,
        timestamp: listing.updated_at,
        relatedEntity: {
          id: listing.id,
          name: listing.winner_name,
          type: 'customer'
        }
      }));
    
    // 7. Add comprehensive activity tracking for all seller processes
    console.log('🔄 Adding comprehensive seller process activities...');
    
    // Process all listings to ensure we capture all seller activities
    for (const listing of (debugInfo.listingsData || [])) {
      // 1. Product Listed Activity (when auction was created)
      activities.push({
        id: `process-listed-${listing.id}`,
        type: 'process',
        subType: 'product_listed',
        message: `📋 Product Listed: ${listing.title} listed for auction starting at ₹${listing.starting_bid?.toLocaleString('en-IN')}`,
        timestamp: listing.created_at,
        amount: listing.starting_bid,
        relatedEntity: {
          id: listing.id,
          name: listing.title,
          type: 'listing'
        }
      });
      
      // 2. Auction Ended Activity (for ended/sold auctions)
      if (listing.status === 'ended' || listing.status === 'sold') {
        activities.push({
          id: `process-ended-${listing.id}`,
          type: 'process',
          subType: 'auction_ended',
          message: `🏁 Auction Ended: ${listing.title} auction completed with final bid ₹${listing.current_bid?.toLocaleString('en-IN')}`,
          timestamp: listing.end_date || listing.updated_at,
          amount: listing.current_bid,
          relatedEntity: {
            id: listing.id,
            name: listing.title,
            type: 'listing'
          }
        });
      }
      
      // 3. Payment Completed Activity (for sold items)
      if (listing.status === 'sold') {
        activities.push({
          id: `process-payment-${listing.id}`,
          type: 'process',
          subType: 'payment_completed',
          message: `💰 Payment Completed: Received ₹${listing.current_bid?.toLocaleString('en-IN')} for ${listing.title}`,
          timestamp: listing.updated_at,
          amount: listing.current_bid,
          relatedEntity: {
            id: listing.id,
            name: listing.title,
            type: 'listing'
          }
        });
        
        // 4. Ownership Transferred Activity
        activities.push({
          id: `process-ownership-${listing.id}`,
          type: 'process',
          subType: 'ownership_transferred',
          message: `🔄 Ownership Transferred: ${listing.title} ownership transferred to ${listing.winner_name || 'buyer'}`,
          timestamp: listing.updated_at,
          relatedEntity: {
            id: listing.id,
            name: listing.title,
            type: 'listing'
          },
          metadata: {
            newOwner: listing.winner_name
          }
        });
      }
    }
    
    // Process all products to ensure we capture product additions
    for (const product of (debugInfo.productsData || [])) {
      // 1. Product Added Activity
      activities.push({
        id: `process-added-${product.id}`,
        type: 'process',
        subType: 'product_added',
        message: `📦 Product Added: ${product.name} added to inventory with base price ₹${product.base_price?.toLocaleString('en-IN')}`,
        timestamp: product.created_at,
        amount: product.base_price,
        relatedEntity: {
          id: product.id,
          name: product.name,
          type: 'product'
        }
      });
    }
    
    console.log('✅ Comprehensive seller process activities added');
    
    // 8. Add customer activities
    activities.push(...customerActivities);
    
    // Sort by timestamp and return latest activities
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, parseInt(limit));
    
    console.log(`📊 Total activities found: ${activities.length}, returning: ${sortedActivities.length}`);
    console.log('🏷️ Activity types:', [...new Set(activities.map(a => a.type))]);
    console.log('🔍 Debug info:', debugInfo);
    
    res.json({
      success: true,
      activities: sortedActivities,
      total: sortedActivities.length,
      debug: {
        totalActivities: activities.length,
        ...debugInfo
      }
    });
    
  } catch (error) {
    console.error('Dashboard activity error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get seller dashboard stats
router.get('/seller/:sellerId/stats', requireAuth, async (req, res) => {
  try {
    const { sellerId } = req.params;
    
    console.log('Getting seller dashboard stats for:', sellerId);
    
    // Get products count
    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', sellerId);
    
    // Get listings stats
    const { data: listings } = await supabase
      .from('listings')
      .select('status, current_bid, base_price')
      .eq('seller_id', sellerId);
    
    const activeListings = listings?.filter(l => l.status === 'active').length || 0;
    const soldItems = listings?.filter(l => l.status === 'sold').length || 0;
    const totalRevenue = listings?.filter(l => l.status === 'sold')
      .reduce((sum, l) => sum + (l.current_bid || 0), 0) || 0;
    
    const stats = {
      totalProducts: totalProducts || 0,
      activeListings,
      soldItems,
      totalRevenue,
      totalListings: listings?.length || 0,
      successRate: listings?.length > 0 ? Math.round((soldItems / listings.length) * 100) : 0
    };
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;