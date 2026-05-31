import express from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';
import { sendAuctionWinnerEmail } from '../services/emailService.js';

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

// Place a bid on a listing
router.post('/:id/bid', requireAuth, async (req, res) => {
  try {
    const { id: listingId } = req.params;
    const { bidAmount, bidderId, bidderName } = req.body;
    const userId = req.user.id;

    // Prevent admin users from placing bids
    if (req.user?.role === 'admin') {
      return res.status(403).json({ error: 'Admin users cannot place bids on auctions' });
    }

    console.log('Bid request received:', {
      listingId,
      bidAmount,
      bidderId,
      bidderName,
      userId,
      userFromAuth: req.user
    });

    if (!bidAmount) {
      console.log('Missing bid amount');
      return res.status(400).json({ error: 'Bid amount is required' });
    }

    // Check if listing exists and is active
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .eq('status', 'active')
      .single();

    console.log('Listing lookup result:', { listing, listingError });

    if (listingError || !listing) {
      console.log('Listing not found or not active');
      return res.status(404).json({ error: 'Listing not found or not active' });
    }

    // Check if bid amount is higher than current price
    console.log('Bid validation:', {
      bidAmount,
      currentBid: listing.current_bid,
      isHigher: bidAmount > listing.current_bid
    });

    if (bidAmount <= listing.current_bid) {
      console.log('Bid amount too low');
      return res.status(400).json({ error: 'Bid must be higher than current price' });
    }

    // Check if bidder is not the seller
    if (listing.seller_id === userId) {
      return res.status(400).json({ error: 'Sellers cannot bid on their own items' });
    }

    // Check if user is already the highest bidder (prevent consecutive bids)
    const { data: currentHighestBid, error: bidCheckError } = await supabase
      .from('bids')
      .select('bidder_id')
      .eq('listing_id', listingId)
      .eq('is_winning', true)
      .single();

    if (!bidCheckError && currentHighestBid && currentHighestBid.bidder_id === userId) {
      return res.status(400).json({ 
        error: 'You are already the highest bidder. Wait for another user to bid before placing a new bid.',
        code: 'CONSECUTIVE_BID_NOT_ALLOWED'
      });
    }

    // Place the bid
    const { data: newBid, error: bidError } = await supabase
      .from('bids')
      .insert([
        {
          listing_id: listingId,
          bidder_id: userId,
          amount: bidAmount,
          created_at: new Date().toISOString(),
          is_winning: true
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
    }

    // Mark previous bids as not winning
    const { error: updatePreviousBidsError } = await supabase
      .from('bids')
      .update({ is_winning: false })
      .eq('listing_id', listingId)
      .neq('id', newBid.id);

    if (updatePreviousBidsError) {
      console.error('Error updating previous bids:', updatePreviousBidsError);
    }

    res.status(201).json({
      message: 'Bid placed successfully',
      bid: newBid,
      newCurrentBid: bidAmount,
      listing: {
        id: listingId,
        currentBid: bidAmount,
        highestBidderId: userId,
        highestBidderName: req.user.fullName || 'Anonymous'
      }
    });
  } catch (error) {
    console.error('Bid placement error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single listing by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Getting single listing:', id);
    
    // Get the listing with product information
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select(`
        *,
        products!inner(
          id,
          name,
          image_url
        )
      `)
      .eq('id', id)
      .single();

    if (listingError || !listing) {
      console.log('Listing not found:', listingError);
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Get highest bidder info
    const { data: highestBid } = await supabase
      .from('bids')
      .select('bidder_id, users(full_name)')
      .eq('listing_id', listing.id)
      .eq('is_winning', true)
      .single();

    // Get total bid count for this listing
    const { count: totalBids } = await supabase
      .from('bids')
      .select('*', { count: 'exact', head: true })
      .eq('listing_id', listing.id);

    // Transform response to match frontend interface
    const transformedListing = {
      id: listing.id,
      productId: listing.product_id || listing.id,
      productName: listing.title,
      productImage: listing.products?.image_url || null,
      basePrice: parseFloat(listing.starting_bid || 100),
      currentBid: parseFloat(listing.current_bid || listing.starting_bid || 100),
      bidIncrement: parseFloat(listing.bid_increment || 500),
      highestBidderId: highestBid?.bidder_id || null,
      highestBidderName: highestBid?.users?.full_name || null,
      sellerId: listing.seller_id,
      sellerName: 'Unknown Seller',
      startDateTime: listing.created_at,
      endDateTime: new Date(new Date(listing.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString(),
      status: listing.status === 'pending' ? 'listed' : listing.status,
      totalBids: totalBids || 0,
      createdAt: listing.created_at,
      updatedAt: listing.updated_at
    };

    console.log('Returning single listing:', transformedListing);
    res.json(transformedListing);
  } catch (error) {
    console.error('Single listing fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all listings (public - for browsing)
router.get('/', async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    
    console.log('GET /api/listings called with params:', { search, status, page, limit });
    
    let query = supabase
      .from('listings')
      .select(`
        id,
        title,
        description,
        product_id,
        seller_id,
        starting_bid,
        current_bid,
        bid_increment,
        status,
        start_date,
        end_date,
        created_at,
        updated_at,
        products!inner(
          id,
          name,
          image_url
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }
    
    if (status) {
      query = query.eq('status', status);
    }

    // Apply pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: listings, error, count } = await query;

    if (error) {
      console.error('Error fetching listings:', error);
      return res.status(500).json({ error: 'Failed to fetch listings', details: error.message });
    }

    console.log(`Found ${listings?.length || 0} listings`);

    if (!listings || listings.length === 0) {
      return res.json({
        listings: [],
        total: 0,
        page: parseInt(page),
        totalPages: 0
      });
    }

    // Get all listing IDs for batch query
    const listingIds = listings.map(l => l.id);

    // Batch query for highest bidders - much faster than individual queries
    const { data: highestBids } = await supabase
      .from('bids')
      .select('listing_id, bidder_id, users!bidder_id(full_name)')
      .in('listing_id', listingIds)
      .eq('is_winning', true);

    // Batch query for bid counts
    const { data: bidCounts } = await supabase
      .from('bids')
      .select('listing_id')
      .in('listing_id', listingIds);

    // Create lookup maps for O(1) access
    const bidderMap = new Map();
    const bidCountMap = new Map();

    if (highestBids) {
      highestBids.forEach(bid => {
        bidderMap.set(bid.listing_id, {
          bidderId: bid.bidder_id,
          bidderName: bid.users?.full_name || null
        });
      });
    }

    if (bidCounts) {
      bidCounts.forEach(bid => {
        bidCountMap.set(bid.listing_id, (bidCountMap.get(bid.listing_id) || 0) + 1);
      });
    }

    // Transform response to match frontend interface
    const transformedListings = listings.map(listing => {
      const bidderInfo = bidderMap.get(listing.id) || {};
      const totalBids = bidCountMap.get(listing.id) || 0;

      return {
        id: listing.id,
        productId: listing.product_id || listing.id,
        productName: listing.products?.name || listing.title || 'Unknown Product',
        productImage: listing.products?.image_url || null,
        basePrice: parseFloat(listing.starting_bid || 100),
        currentBid: parseFloat(listing.current_bid || listing.starting_bid || 100),
        bidIncrement: parseFloat(listing.bid_increment || 500),
        highestBidderId: bidderInfo.bidderId || null,
        highestBidderName: bidderInfo.bidderName || null,
        sellerId: listing.seller_id,
        sellerName: 'Unknown Seller',
        startDateTime: listing.start_date || listing.created_at,
        endDateTime: listing.end_date || new Date(new Date(listing.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString(),
        status: listing.status === 'pending' ? 'listed' : listing.status,
        totalBids: totalBids,
        createdAt: listing.created_at,
        updatedAt: listing.updated_at
      };
    });

    console.log(`Returning ${transformedListings.length} transformed listings`);

    res.json({
      listings: transformedListings,
      total: count || 0,
      page: parseInt(page),
      totalPages: Math.ceil((count || 0) / parseInt(limit))
    });
  } catch (error) {
    console.error('Listings fetch error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get seller's listings (authenticated)
router.get('/seller/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { search, status, page = 1, limit = 20, availableProducts } = req.query;
    
    console.log('Seller route called with:', { sellerId, availableProducts, query: req.query });
    
    // If availableProducts query param is present, return available products instead
    if (availableProducts === 'true') {
      console.log('Available products requested for sellerId:', sellerId);
      
      // Get all products for this seller
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, base_price, image_url, category_id')
        .eq('seller_id', sellerId);

      if (productsError) {
        console.error('Error fetching products:', productsError);
        return res.status(500).json({ error: 'Failed to fetch products' });
      }

      // Get all active/pending listings
      const { data: activeListings, error: listingsError } = await supabase
        .from('listings')
        .select('title')
        .in('status', ['pending', 'active']);

      if (listingsError) {
        console.error('Error fetching listings:', listingsError);
        return res.status(500).json({ error: 'Failed to fetch listings' });
      }

      // Filter out products that are already listed
      const listedProductNames = new Set(activeListings?.map(l => l.title) || []);
      const availableProductsList = products?.filter(p => !listedProductNames.has(p.name)) || [];

      return res.json({
        availableProducts: availableProductsList,
        totalProducts: products?.length || 0,
        listedProducts: products?.length - availableProductsList.length || 0
      });
    }
    
    // Regular seller listings logic
    let query = supabase
      .from('listings')
      .select(`
        id,
        title,
        description,
        product_id,
        seller_id,
        starting_bid,
        current_bid,
        status,
        created_at,
        updated_at,
        products!inner(
          id,
          name,
          image_url
        )
      `)
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }
    
    if (status) {
      query = query.eq('status', status);
    }

    // Apply pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: listings, error, count } = await query;

    if (error) {
      console.error('Error fetching seller listings:', error);
      return res.status(500).json({ error: 'Failed to fetch listings' });
    }

    // Get highest bidder information and total bids for each listing
    const listingsWithBidders = await Promise.all(
      listings.map(async (listing) => {
        const { data: highestBid } = await supabase
          .from('bids')
          .select('bidder_id, users(full_name)')
          .eq('listing_id', listing.id)
          .eq('is_winning', true)
          .single();

        // Get total bid count for this listing
        const { count: totalBids } = await supabase
          .from('bids')
          .select('*', { count: 'exact', head: true })
          .eq('listing_id', listing.id);

        return {
          ...listing,
          highestBidderId: highestBid?.bidder_id || null,
          highestBidderName: highestBid?.users?.full_name || null,
          totalBids: totalBids || 0
        };
      })
    );

    // Transform response to match frontend interface
    const transformedListings = listingsWithBidders.map(listing => ({
      id: listing.id,
      productId: listing.product_id || listing.id,
      productName: listing.title,
      productImage: listing.products?.image_url || null,
      basePrice: parseFloat(listing.starting_bid || 100),
      currentBid: parseFloat(listing.current_bid || listing.starting_bid || 100),
      bidIncrement: parseFloat(listing.bid_increment || 500),
      highestBidderId: listing.highestBidderId,
      highestBidderName: listing.highestBidderName,
      sellerId: listing.seller_id,
      sellerName: 'Unknown Seller',
      startDateTime: listing.created_at,
      endDateTime: new Date(new Date(listing.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString(),
      status: listing.status === 'pending' ? 'listed' : listing.status,
      totalBids: listing.totalBids,
      createdAt: listing.created_at,
      updatedAt: listing.updated_at
    }));

    res.json({
      listings: transformedListings,
      total: count || 0,
      page: parseInt(page),
      totalPages: Math.ceil((count || 0) / parseInt(limit))
    });
  } catch (error) {
    console.error('Seller listings fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new listing
router.post('/', requireAuth, async (req, res) => {
  try {
    const { productId, startDateTime, endDateTime, sellerId, sellerName } = req.body;

    // Prevent admin users from creating listings (they should only manage, not sell)
    if (req.user?.role === 'admin') {
      return res.status(403).json({ error: 'Admin users cannot create listings or sell products' });
    }

    // Ensure user can only create listings for themselves
    if (req.user.id !== sellerId) {
      return res.status(403).json({ error: 'You can only create listings for your own products' });
    }

    // Validate required fields
    if (!productId || !startDateTime || !endDateTime) {
      return res.status(400).json({ error: 'Product ID, start date/time, and end date/time are required' });
    }

    // Validate dates with better timezone handling
    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);
    const now = new Date();
    
    console.log('Date validation:', {
      startDateTime,
      endDateTime,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      now: now.toISOString(),
      startDateValid: !isNaN(startDate.getTime()),
      endDateValid: !isNaN(endDate.getTime()),
      startDateLocal: startDate.toString(),
      nowLocal: now.toString(),
      timezoneOffset: startDate.getTimezoneOffset(),
      serverTimezoneOffset: now.getTimezoneOffset()
    });

    // Check if dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Allow auctions to start immediately - no minimum time restriction
    // Only check that start date is not more than 1 hour in the past (to handle timezone issues)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    if (startDate < oneHourAgo) {
      return res.status(400).json({ 
        error: `Start date cannot be more than 1 hour in the past. Current time: ${now.toLocaleString()}, Selected time: ${startDate.toLocaleString()}`,
        debug: {
          startDate: startDate.toISOString(),
          now: now.toISOString(),
          oneHourAgo: oneHourAgo.toISOString(),
          timeDifference: startDate.getTime() - now.getTime(),
          timeDifferenceMinutes: (startDate.getTime() - now.getTime()) / (1000 * 60)
        }
      });
    }

    if (endDate <= startDate) {
      return res.status(400).json({ error: 'End date and time must be after start date and time' });
    }

    // Determine initial status based on start time
    const initialStatus = startDate <= now ? 'active' : 'pending';
    
    console.log('Listing creation - Status determination:', {
      startDate: startDate.toISOString(),
      now: now.toISOString(),
      initialStatus,
      shouldStartImmediately: startDate <= now,
      timeDifference: startDate.getTime() - now.getTime(),
      timeDifferenceMinutes: (startDate.getTime() - now.getTime()) / (1000 * 60)
    });

    console.log('Listing creation request:', {
      productId,
      startDateTime,
      endDateTime,
      sellerId,
      sellerName,
      requestBody: req.body
    });

    // Get product details
    console.log('Looking up product with ID:', productId);
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, image_url, base_price, seller_id')
      .eq('id', productId)
      .single();

    console.log('Product lookup result:', {
      product,
      productError,
      productId,
      productFound: !!product
    });

    if (productError || !product) {
      console.error('Product not found:', {
        productId,
        productError,
        errorMessage: productError?.message,
        errorCode: productError?.code
      });
      return res.status(404).json({ 
        error: 'Product not found',
        productId,
        details: productError?.message 
      });
    }

    // Check if product is already listed
    const { data: existingListing } = await supabase
      .from('listings')
      .select('id, status')
      .eq('product_id', productId)  // Use product_id instead of title
      .in('status', ['pending', 'active'])
      .single();

    if (existingListing) {
      return res.status(400).json({ 
        error: `Product "${product.name}" is already listed for auction with status: ${existingListing.status}. Please wait for the current auction to end or cancel it first.`,
        code: 'PRODUCT_ALREADY_LISTED',
        existingListingId: existingListing.id,
        existingStatus: existingListing.status
      });
    }

    // Create listing in database using the actual available columns
    const { data: listing, error } = await supabase
      .from('listings')
      .insert([{
        title: product.name,
        description: `Auction for ${product.name}`,
        product_id: productId,  // Add the product_id field
        seller_id: sellerId || product.seller_id,
        starting_bid: parseFloat(product.base_price),
        current_bid: parseFloat(product.base_price),
        status: startDate <= now ? 'active' : 'pending', // Start immediately if time has passed
        start_date: startDateTime,
        end_date: endDateTime
      }])
      .select(`
        id,
        title,
        description,
        product_id,
        seller_id,
        starting_bid,
        current_bid,
        status,
        start_date,
        end_date,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      console.error('Error creating listing:', error);
      return res.status(500).json({ error: 'Failed to create listing' });
    }

    // Transform response to match frontend interface
    const transformedListing = {
      id: listing.id,
      productId: productId,
      productName: listing.title,
      productImage: product.image_url,
      basePrice: parseFloat(listing.starting_bid || product.base_price),
      currentBid: parseFloat(listing.current_bid || product.base_price),
      highestBidderId: null,
      highestBidderName: null,
      sellerId: listing.seller_id,
      sellerName: sellerName || 'Test User',
      startDateTime: listing.start_date || startDateTime,
      endDateTime: listing.end_date || endDateTime,
      status: 'listed',
      totalBids: 0,
      createdAt: listing.created_at,
      updatedAt: listing.updated_at
    };

    res.status(201).json(transformedListing);
  } catch (error) {
    console.error('Listing creation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update listing status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, winnerName } = req.body;

    console.log('Updating listing status:', { id, status, winnerName });

    // Map frontend statuses to valid database statuses
    const statusMapping = {
      'sold': 'ended',
      'completed': 'ended',
      'active': 'active',
      'pending': 'pending',
      'ended': 'ended',
      'cancelled': 'cancelled'
    };

    const validStatus = statusMapping[status] || status;
    console.log('Mapped status:', status, '->', validStatus);

    // Validate status
    const validStatuses = ['active', 'pending', 'ended', 'cancelled'];
    if (!validStatuses.includes(validStatus)) {
      return res.status(400).json({ 
        error: 'Invalid status', 
        validStatuses,
        receivedStatus: status,
        mappedStatus: validStatus
      });
    }

    // Get existing listing to check ownership
    const { data: existingListing, error: fetchError } = await supabase
      .from('listings')
      .select('seller_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingListing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Prepare update data
    const updateData = { 
      status: validStatus,
      updated_at: new Date().toISOString()
    };

    // Update listing in database
    const { data: listing, error } = await supabase
      .from('listings')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        title,
        description,
        product_id,
        seller_id,
        starting_bid,
        current_bid,
        status,
        created_at,
        updated_at,
        products!inner(
          id,
          name,
          image_url
        )
      `)
      .single();

    if (error) {
      console.error('Error updating listing:', error);
      return res.status(500).json({ error: 'Failed to update listing' });
    }

    // If auction is being manually ended, check for winner and send email
    if (validStatus === 'ended') {
      console.log(`Auction manually ended: ${listing.title} (ID: ${listing.id})`);
      
      // Check if there's a winning bid
      const { data: winningBid, error: bidError } = await supabase
        .from('bids')
        .select('bidder_id, amount')
        .eq('listing_id', listing.id)
        .eq('is_winning', true)
        .single();

      if (winningBid && !bidError) {
        console.log(`Found winning bid for manually ended auction: ₹${winningBid.amount} by ${winningBid.bidder_id}`);
        
        // Always send winner email first (most important)
        try {
          // Get winner's details
          const { data: winnerData, error: winnerError } = await supabase
            .from('users')
            .select('email, full_name')
            .eq('id', winningBid.bidder_id)
            .single();

          if (winnerData && !winnerError) {
            console.log(`📧 Sending auction winner email to ${winnerData.email} (manually ended auction)`);
            
            // Get original product for email details
            const { data: originalProduct, error: productError } = await supabase
              .from('products')
              .select('*')
              .eq('id', listing.product_id)
              .single();
            
            if (originalProduct && !productError) {
              await sendAuctionWinnerEmail(
                winnerData.email,
                winnerData.full_name,
                originalProduct.name,
                winningBid.amount,
                listing.id,
                originalProduct.image_url
              );
              
              console.log(`✅ Auction winner email sent successfully to ${winnerData.email} for manually ended auction`);
            }
          } else {
            console.error(`❌ Error fetching winner details for manually ended auction:`, winnerError);
          }
        } catch (emailError) {
          console.error(`❌ Error sending auction winner email for manually ended auction:`, emailError);
        }
        
        // Note: Ownership transfer will happen only after payment verification
        // The winner will receive an email notification but won't own the product until they pay
        console.log(`✅ Winner notification sent for ${listing.title}. Ownership transfer will occur after payment.`);
      } else {
        console.log(`No winning bid found for manually ended auction: ${listing.title}`);
      }
    }

    // Transform response to match frontend interface
    const transformedListing = {
      id: listing.id,
      productId: listing.product_id || listing.id,
      productName: listing.title,
      productImage: listing.products?.image_url || null,
      basePrice: parseFloat(listing.starting_bid || 100),
      currentBid: parseFloat(listing.current_bid || listing.starting_bid || 100),
      highestBidderId: null,
      highestBidderName: null,
      winnerName: winnerName || null,
      sellerId: listing.seller_id,
      sellerName: 'Unknown Seller',
      startDateTime: listing.created_at,
      endDateTime: new Date(new Date(listing.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString(),
      status: status, // Return the original status the frontend expects
      actualStatus: listing.status, // Include the actual database status for debugging
      totalBids: 0,
      createdAt: listing.created_at,
      updatedAt: listing.updated_at
    };

    res.json(transformedListing);
  } catch (error) {
    console.error('Listing update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Auto-update auction statuses based on time
router.post('/update-statuses', async (req, res) => {
  try {
    console.log('Auto-updating auction statuses...');
    const now = new Date();
    let updatedCount = 0;

    console.log('Current time:', now.toISOString());

    // Get all scheduled listings that should become active (status: 'pending' -> 'active')
    const { data: scheduledListings, error: scheduledError } = await supabase
      .from('listings')
      .select('*')
      .eq('status', 'pending')
      .not('start_date', 'is', null);

    if (scheduledError) {
      console.error('Error fetching scheduled listings:', scheduledError);
    } else {
      console.log(`Found ${scheduledListings?.length || 0} pending listings to check`);
      
      if (scheduledListings && scheduledListings.length > 0) {
        for (const listing of scheduledListings) {
          const startDate = new Date(listing.start_date);
          console.log(`Checking listing ${listing.id} (${listing.title}):`, {
            startDate: startDate.toISOString(),
            currentTime: now.toISOString(),
            shouldActivate: startDate <= now
          });
          
          if (startDate <= now) {
            const { error: updateError } = await supabase
              .from('listings')
              .update({ 
                status: 'active',
                updated_at: now.toISOString()
              })
              .eq('id', listing.id);

            if (updateError) {
              console.error(`Error activating listing ${listing.id}:`, updateError);
            } else {
              updatedCount++;
              console.log(`✅ Activated listing: ${listing.title} (ID: ${listing.id})`);
            }
          }
        }
      }
    }

    // Get all active listings that should end
    const { data: activeListings, error: activeError } = await supabase
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .not('end_date', 'is', null)
      .lte('end_date', now.toISOString());

    if (activeError) {
      console.error('Error fetching active listings:', activeError);
    } else if (activeListings && activeListings.length > 0) {
      console.log(`Found ${activeListings.length} listings to end`);
      
      for (const listing of activeListings) {
        // Check if there's a winning bid
        const { data: winningBid, error: bidError } = await supabase
          .from('bids')
          .select('bidder_id, amount')
          .eq('listing_id', listing.id)
          .eq('is_winning', true)
          .single();

        const newStatus = winningBid ? 'ended' : 'ended';
        
        const { error: updateError } = await supabase
          .from('listings')
          .update({ 
            status: newStatus,
            updated_at: now.toISOString()
          })
          .eq('id', listing.id);

        if (updateError) {
          console.error(`Error ending listing ${listing.id}:`, updateError);
        } else {
          updatedCount++;
          console.log(`Ended listing: ${listing.title} (${newStatus})`);
          
          // If there's a winning bid, send winner notification (but don't transfer ownership yet)
          if (winningBid && winningBid.bidder_id) {
            console.log(`Auction ended for ${listing.title}. Sending winner notification. Ownership transfer will occur after payment.`);
            
            // Send winner email notification
            try {
              // Get winner's details
              const { data: winnerData, error: winnerError } = await supabase
                .from('users')
                .select('email, full_name')
                .eq('id', winningBid.bidder_id)
                .single();

              if (winnerData && !winnerError) {
                console.log(`📧 Sending auction winner email to ${winnerData.email} (automatic expiration)`);
                
                // Get the original product details for email
                const { data: originalProduct, error: productError } = await supabase
                  .from('products')
                  .select('*')
                  .eq('id', listing.product_id)
                  .single();

                if (originalProduct && !productError) {
                  await sendAuctionWinnerEmail(
                    winnerData.email,
                    winnerData.full_name,
                    originalProduct.name,
                    winningBid.amount,
                    listing.id,
                    originalProduct.image_url
                  );
                  
                  console.log(`✅ Auction winner email sent successfully to ${winnerData.email} for automatic expiration`);
                } else {
                  console.error(`❌ Error fetching product details for winner email:`, productError);
                }
              } else {
                console.error(`❌ Error fetching winner details for automatic expiration:`, winnerError);
              }
            } catch (emailError) {
              console.error(`❌ Error sending auction winner email for automatic expiration:`, emailError);
              // Don't fail the entire process if email fails
            }
            
            // Note: Ownership transfer will happen only after payment verification in payments.js
            console.log(`✅ Winner notification sent for ${listing.title}. Ownership transfer will occur after payment.`);
          }
        }
      }
    }

    // Check for already ended auctions that might not have had winner emails sent
    console.log('Checking for ended auctions that need winner email processing...');
    const { data: endedListings, error: endedError } = await supabase
      .from('listings')
      .select('*')
      .eq('status', 'ended');

    if (endedError) {
      console.error('Error fetching ended listings:', endedError);
    } else if (endedListings && endedListings.length > 0) {
      console.log(`Found ${endedListings.length} ended listings to check for winner emails`);
      
      for (const listing of endedListings) {
        // Check if there's a winning bid
        const { data: winningBid, error: bidError } = await supabase
          .from('bids')
          .select('bidder_id, amount')
          .eq('listing_id', listing.id)
          .eq('is_winning', true)
          .single();

        if (winningBid && !bidError) {
          console.log(`Processing ended auction: ${listing.title} with winner ${winningBid.bidder_id}`);
          
          // Check if ownership has already been transferred by looking for a product owned by the winner
          const { data: existingProduct, error: existingProductError } = await supabase
            .from('products')
            .select('id')
            .eq('seller_id', winningBid.bidder_id)
            .eq('name', listing.title)
            .single();

          // Send winner email notification but don't transfer ownership yet
          // Ownership will be transferred only after payment verification
          if (!existingProduct || existingProductError) {
            console.log(`Auction ended for ${listing.title}. Sending winner notification. Ownership transfer will occur after payment.`);
            
            // Send winner email notification
            try {
              // Get winner's details
              const { data: winnerData, error: winnerError } = await supabase
                .from('users')
                .select('email, full_name')
                .eq('id', winningBid.bidder_id)
                .single();

              if (winnerData && !winnerError) {
                console.log(`📧 Sending auction winner email to ${winnerData.email}`);
                
                // Get the original product details for email
                const { data: originalProduct, error: productError } = await supabase
                  .from('products')
                  .select('*')
                  .eq('id', listing.product_id)
                  .single();

                if (originalProduct && !productError) {
                  await sendAuctionWinnerEmail(
                    winnerData.email,
                    winnerData.full_name,
                    originalProduct.name,
                    winningBid.amount,
                    listing.id,
                    originalProduct.image_url
                  );
                  
                  console.log(`✅ Auction winner email sent successfully to ${winnerData.email}`);
                  updatedCount++;
                }
              } else {
                console.error(`❌ Error fetching winner details:`, winnerError);
              }
            } catch (emailError) {
              console.error(`❌ Error sending auction winner email:`, emailError);
              // Don't fail the entire process if email fails
            }
          } else {
            console.log(`Winner already notified for ${listing.title}, skipping...`);
          }
        }
      }
    }

    res.json({ 
      message: 'Status update completed',
      updatedCount,
      timestamp: now.toISOString()
    });
  } catch (error) {
    console.error('Auto-update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get available products for listing (seller-specific)
router.get('/available-products-for/:sellerId', requireAuth, async (req, res) => {
  try {
    const { sellerId } = req.params;
    
    console.log('Getting available products for seller:', sellerId);
    
    // Get all products for this seller that are not sold
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, base_price, image_url, category_id, status')
      .eq('seller_id', sellerId)
      .eq('status', 'active'); // Only active products (not sold)

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return res.status(500).json({ error: 'Failed to fetch products' });
    }

    // Get all active/pending listings to exclude already listed products
    const { data: activeListings, error: listingsError } = await supabase
      .from('listings')
      .select('product_id')
      .in('status', ['pending', 'active']);

    if (listingsError) {
      console.error('Error fetching listings:', listingsError);
      return res.status(500).json({ error: 'Failed to fetch listings' });
    }

    // Filter out products that are already listed
    const listedProductIds = new Set(activeListings?.map(l => l.product_id) || []);
    const availableProducts = products?.filter(p => !listedProductIds.has(p.id)) || [];

    console.log(`Found ${products?.length || 0} active products, ${availableProducts.length} available for listing`);

    res.json({
      availableProducts: availableProducts,
      totalProducts: products?.length || 0,
      listedProducts: (products?.length || 0) - availableProducts.length
    });
  } catch (error) {
    console.error('Available products error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get dashboard metrics for seller
router.get('/dashboard/:sellerId', requireAuth, async (req, res) => {
  try {
    const { sellerId } = req.params;
    
    console.log('Getting dashboard metrics for seller:', sellerId);
    
    // Get seller's products (only active ones)
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, status')
      .eq('seller_id', sellerId)
      .eq('status', 'active'); // Only count active products

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return res.status(500).json({ error: 'Failed to fetch products' });
    }

    // Get seller's listings
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('id, title, status, product_id')
      .eq('seller_id', sellerId);

    if (listingsError) {
      console.error('Error fetching listings:', listingsError);
      return res.status(500).json({ error: 'Failed to fetch listings' });
    }

    // Get winning bids for seller's auctions
    const { data: winningBids, error: bidsError } = await supabase
      .from('bids')
      .select(`
        id, 
        amount, 
        is_winning,
        listings!listing_id (
          id,
          title,
          status,
          seller_id
        )
      `)
      .eq('is_winning', true)
      .eq('listings.seller_id', sellerId);

    if (bidsError) {
      console.error('Error fetching winning bids:', bidsError);
    }

    // Calculate metrics
    const totalProducts = products?.length || 0;
    const totalListings = listings?.length || 0;
    const activeListings = listings?.filter(l => l.status === 'active').length || 0;
    const endedListings = listings?.filter(l => l.status === 'ended').length || 0;
    
    // Items sold = ended auctions with winning bids
    const soldItems = winningBids?.filter(bid => bid.listings?.status === 'ended').length || 0;
    
    // Available to list = products not currently in active/pending listings
    const listedProductIds = listings?.filter(l => ['active', 'pending'].includes(l.status)).map(l => l.product_id) || [];
    const availableToList = products?.filter(p => !listedProductIds.includes(p.id)).length || 0;
    
    // Calculate revenue
    const totalRevenue = winningBids?.filter(bid => bid.listings?.status === 'ended')
      .reduce((sum, bid) => sum + (bid.amount || 0), 0) || 0;

    const metrics = {
      totalProducts,
      activeAuctions: activeListings,
      itemsSold: soldItems,
      availableToList,
      totalListings,
      endedListings,
      totalRevenue
    };

    console.log('Dashboard metrics calculated:', metrics);

    res.json(metrics);
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
