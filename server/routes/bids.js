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

// Get all bids (admin only)
router.get('/admin/all', async (req, res) => {
  try {
    const { data: bids, error } = await supabase
      .from('bids')
      .select(`
        id,
        amount,
        created_at,
        is_winning,
        bidder_id,
        listing_id,
        users!bidder_id (
          id,
          full_name,
          email
        ),
        listings!listing_id (
          id,
          title,
          status,
          end_date,
          current_bid,
          product_id,
          products!product_id (
            id,
            name,
            image_url
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bids:', error);
      return res.status(500).json({ error: 'Failed to fetch bids', details: error.message });
    }

    console.log('Raw bids data:', JSON.stringify(bids, null, 2));

    // Transform data for frontend
    const transformedBids = bids.map(bid => {
      const status = determineStatus(bid.listings, bid.is_winning);
      
      return {
        id: bid.id,
        bidderName: bid.users?.full_name || 'Unknown Bidder',
        bidderEmail: bid.users?.email || 'No email',
        bidderId: bid.bidder_id,
        productName: bid.listings?.products?.name || bid.listings?.title || 'Sample Product',
        productImage: bid.listings?.products?.image_url || null,
        productId: bid.listings?.product_id || 'unknown',
        listingId: bid.listing_id,
        bidAmount: parseFloat(bid.amount),
        bidDate: bid.created_at,
        status: status,
        auctionStatus: status === 'won' || status === 'lost' ? status : 'ongoing',
        auctionEndDate: bid.listings?.end_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isWinningBid: bid.is_winning
      };
    });

    console.log('Transformed bids:', JSON.stringify(transformedBids, null, 2));

    res.json({
      bids: transformedBids,
      total: transformedBids.length
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to determine bid status
function determineStatus(listing, isWinningBid) {
  if (!listing) return 'outbid';
  
  const now = new Date();
  const endTime = listing.end_date ? new Date(listing.end_date) : null;
  
  // Check if auction has ended
  const hasEnded = listing.status === 'ended' || 
                   listing.status === 'cancelled' || 
                   (endTime && endTime < now);
  
  if (hasEnded) {
    // For ended auctions, winning bid is "won", others are "lost"
    return isWinningBid ? 'won' : 'lost';
  } else if (listing.status === 'active') {
    // For active auctions, winning bid is "active", others are "outbid"
    return isWinningBid ? 'active' : 'outbid';
  } else {
    // Default to outbid for any other status
    return 'outbid';
  }
}

// Get bids for a specific user
router.get('/user/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: bids, error } = await supabase
      .from('bids')
      .select(`
        id,
        amount,
        created_at,
        is_winning,
        listing_id,
        listings!listing_id (
          id,
          title,
          status,
          start_date,
          end_date,
          current_bid,
          product_id,
          products!product_id (
            id,
            name,
            image_url
          )
        )
      `)
      .eq('bidder_id', userId)
      .order('created_at', { ascending: false});

    if (error) {
      console.error('Error fetching user bids:', error);
      return res.status(500).json({ error: 'Failed to fetch user bids' });
    }

    console.log('User bids data:', JSON.stringify(bids, null, 2));

    // Transform data for frontend
    const transformedBids = bids.map(bid => ({
      id: bid.id,
      userId: userId,
      userName: 'User', // We could get this from the user table if needed
      listingId: bid.listing_id,
      productId: bid.listings?.product_id || bid.listing_id,
      productName: bid.listings?.products?.name || bid.listings?.title || 'Unknown Product',
      productImage: bid.listings?.products?.image_url || null,
      bidAmount: parseFloat(bid.amount),
      bidDate: bid.created_at,
      auctionStatus: getAuctionStatus(bid.listings, bid.is_winning),
      auctionEndDate: bid.listings?.end_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      finalPrice: bid.listings?.status === 'ended' ? parseFloat(bid.listings.current_bid) : undefined,
      isWinningBid: bid.is_winning
    }));

    console.log('Transformed user bids:', JSON.stringify(transformedBids, null, 2));

    res.json({
      bids: transformedBids,
      total: transformedBids.length
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Place a new bid
router.post('/', requireAuth, async (req, res) => {
  try {
    const { listingId, bidAmount } = req.body;
    const bidderId = req.user?.id; // Assuming auth middleware sets req.user

    if (!bidderId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Prevent admin users from placing bids
    if (req.user?.role === 'admin') {
      return res.status(403).json({ error: 'Admin users cannot place bids on auctions' });
    }

    if (!listingId || !bidAmount) {
      return res.status(400).json({ error: 'Listing ID and bid amount are required' });
    }

    // Check if listing exists and is active
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .eq('status', 'active')
      .single();

    if (listingError || !listing) {
      return res.status(404).json({ error: 'Listing not found or not active' });
    }

    // Check if auction has ended
    if (listing.end_date && new Date(listing.end_date) < new Date()) {
      return res.status(400).json({ error: 'Auction has ended' });
    }

    // Check if bid amount is higher than current price
    if (bidAmount <= listing.current_price) {
      return res.status(400).json({ error: 'Bid must be higher than current price' });
    }

    // Check if bidder is not the seller
    if (listing.seller_id === bidderId) {
      return res.status(400).json({ error: 'Sellers cannot bid on their own items' });
    }

    // Place the bid
    const { data: newBid, error: bidError } = await supabase
      .from('bids')
      .insert([
        {
          listing_id: listingId,
          bidder_id: bidderId,
          amount: bidAmount,
          created_at: new Date().toISOString(),
          is_winning: true // Initially set as winning, will be updated when new bids come in
        }
      ])
      .select()
      .single();

    if (bidError) {
      console.error('Error placing bid:', bidError);
      return res.status(500).json({ error: 'Failed to place bid' });
    }

    // Update the listing's current bid
    const { error: updateError } = await supabase
      .from('listings')
      .update({ 
        current_bid: bidAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', listingId);

    if (updateError) {
      console.error('Error updating listing:', updateError);
      // Don't fail the request, just log the error
    }

    // Mark previous bids as not winning
    const { error: updatePreviousBidsError } = await supabase
      .from('bids')
      .update({ is_winning: false })
      .eq('listing_id', listingId)
      .neq('id', newBid.id);

    if (updatePreviousBidsError) {
      console.error('Error updating previous bids:', updatePreviousBidsError);
      // Don't fail the request, just log the error
    }

    res.status(201).json({
      message: 'Bid placed successfully',
      bid: newBid
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to determine auction status
function getAuctionStatus(listing, isWinningBid) {
  if (!listing) return 'ongoing';
  
  const now = new Date();
  const endTime = new Date(listing.end_date);
  
  if (listing.status === 'ended') {
    return isWinningBid ? 'won' : 'lost';
  } else if (listing.status === 'cancelled') {
    return 'lost'; // Treat cancelled as lost
  } else if (endTime < now) {
    return isWinningBid ? 'won' : 'lost';
  } else if (listing.status === 'active') {
    return isWinningBid ? 'ongoing' : 'ongoing'; // Both winning and non-winning active bids are ongoing
  } else {
    return 'ongoing'; // Default to ongoing for pending/scheduled auctions
  }
}

export default router;