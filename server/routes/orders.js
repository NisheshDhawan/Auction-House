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

// Get seller's orders (completed sales)
router.get('/seller/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;
    
    console.log('🔍 Orders API: Getting orders for seller:', sellerId);

    // Get all completed listings for this seller with winning bids
    const { data: completedListings, error } = await supabase
      .from('listings')
      .select(`
        id,
        title,
        status,
        end_date,
        created_at,
        product_id,
        products!product_id (
          id,
          name,
          category_id,
          image_url,
          categories!category_id (
            name
          )
        ),
        bids!listing_id (
          id,
          amount,
          created_at,
          bidder_id,
          is_winning,
          users!bidder_id (
            id,
            full_name,
            email
          )
        )
      `)
      .eq('seller_id', sellerId)
      .eq('status', 'ended');

    if (error) {
      console.error('❌ Orders API: Error fetching seller orders:', error);
      return res.status(500).json({ error: 'Failed to fetch seller orders' });
    }

    console.log('✅ Orders API: Found completed listings:', completedListings.length);

    // Process the data to create orders
    const orders = [];
    
    for (const listing of completedListings) {
      // Find the winning bid (highest amount) - ensure only one winning bid per listing
      const winningBid = listing.bids
        .filter(bid => bid.is_winning === true)
        .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))[0];

      if (winningBid && winningBid.users) {
        // Verify this is actually the highest bid
        const allBids = listing.bids.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
        const actualWinningBid = allBids[0];
        
        // Use the actual highest bid if it's different from the marked winning bid
        const correctWinningBid = parseFloat(actualWinningBid.amount) > parseFloat(winningBid.amount) 
          ? actualWinningBid 
          : winningBid;

        if (correctWinningBid.users) {
          const order = {
            id: `order_${listing.id}_${correctWinningBid.id}`,
            sellerId: sellerId,
            buyerId: correctWinningBid.bidder_id,
            buyerName: correctWinningBid.users.full_name || 'Unknown Buyer',
            buyerEmail: correctWinningBid.users.email || 'No Email',
            listingId: listing.id,
            productId: listing.product_id,
            productName: listing.products?.name || listing.title,
            productImage: listing.products?.image_url,
            category: listing.products?.categories?.name || 'General',
            finalPrice: parseFloat(correctWinningBid.amount),
            orderDate: listing.end_date,
            auctionEndDate: listing.end_date,
            status: 'completed',
            totalBids: listing.bids.length
          };
          
          orders.push(order);
        }
      }
    }

    // Sort orders by date (newest first)
    orders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));

    console.log('✅ Orders API: Returning orders:', orders.length);

    res.json({
      orders: orders,
      total: orders.length
    });
  } catch (error) {
    console.error('❌ Orders API: Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get buyer's orders (purchases)
router.get('/buyer/:buyerId', requireAuth, async (req, res) => {
  try {
    const { buyerId } = req.params;

    // Get all winning bids for this buyer
    const { data: winningBids, error } = await supabase
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
            full_name,
            email
          ),
          products!product_id (
            id,
            name,
            category_id,
            image_url,
            categories!category_id (
              name
            )
          )
        )
      `)
      .eq('bidder_id', buyerId)
      .eq('is_winning', true);

    if (error) {
      console.error('Error fetching buyer orders:', error);
      return res.status(500).json({ error: 'Failed to fetch buyer orders' });
    }

    // Process the data to create orders
    const orders = winningBids
      .filter(bid => bid.listings?.status === 'ended')
      .map(bid => ({
        id: `order_${bid.listing_id}_${bid.id}`,
        sellerId: bid.listings.seller_id,
        buyerId: buyerId,
        buyerName: req.user.fullName,
        buyerEmail: req.user.email,
        listingId: bid.listing_id,
        productId: bid.listings.product_id,
        productName: bid.listings.products?.name || bid.listings.title,
        productImage: bid.listings.products?.image_url,
        category: bid.listings.products?.categories?.name || 'General',
        finalPrice: parseFloat(bid.amount),
        orderDate: bid.listings.end_date,
        auctionEndDate: bid.listings.end_date,
        status: 'completed',
        sellerName: bid.listings.users?.full_name || 'Unknown Seller',
        sellerEmail: bid.listings.users?.email
      }));

    // Sort orders by date (newest first)
    orders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));

    res.json({
      orders: orders,
      total: orders.length
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;