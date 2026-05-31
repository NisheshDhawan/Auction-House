import express from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';
import { razorpayService } from '../services/razorpayService.js';

const router = express.Router();

console.log('=== PAYMENTS ROUTES FILE LOADED ===');

// Test endpoint to verify routes are working - placed at the beginning
router.get('/test-endpoint', (req, res) => {
  console.log('Test endpoint called');
  res.json({ message: 'Payment routes test endpoint working!' });
});

// Authentication middleware
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('Auth middleware - checking token:', {
      hasAuthHeader: !!authHeader,
      authHeaderStart: authHeader?.substring(0, 30) + '...',
      startsWithBearer: authHeader?.startsWith('Bearer ')
    });
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Auth middleware - no token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    console.log('Auth middleware - extracted token:', {
      tokenLength: token.length,
      tokenStart: token.substring(0, 20) + '...'
    });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth middleware - token decoded successfully:', {
      userId: decoded.userId
    });

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .eq('id', decoded.userId)
      .single();

    if (userError || !userData) {
      console.log('Auth middleware - user not found:', userError);
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      id: userData.id,
      email: userData.email,
      fullName: userData.full_name,
      role: userData.role
    };
    
    console.log('Auth middleware - success:', {
      userId: userData.id,
      email: userData.email
    });
    
    next();
  } catch (error) {
    console.error('Auth middleware error details:', {
      errorType: error.constructor.name,
      errorMessage: error.message,
      tokenProvided: !!req.headers.authorization,
      jwtSecret: !!process.env.JWT_SECRET
    });
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Create payment order for auction bid
router.post('/create-order', requireAuth, async (req, res) => {
  try {
    const { listingId, bidAmount, type = 'bid_payment' } = req.body;
    const userId = req.user.id;

    console.log('Creating payment order:', { listingId, bidAmount, type, userId });

    if (!listingId || !bidAmount) {
      return res.status(400).json({ error: 'Listing ID and bid amount are required' });
    }

    // Verify listing exists and is active
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Validate bid amount
    if (bidAmount <= listing.current_bid) {
      return res.status(400).json({ error: 'Bid amount must be higher than current bid' });
    }

    // Create unique receipt ID (max 40 characters for Razorpay)
    const timestamp = Date.now().toString().slice(-8); // Last 8 digits
    const shortListingId = listingId.slice(-8); // Last 8 characters
    const shortUserId = userId.slice(-8); // Last 8 characters
    const receipt = `${type.slice(0,3)}_${shortListingId}_${shortUserId}_${timestamp}`;

    // Create Razorpay order
    const orderResult = await razorpayService.createOrder({
      amount: bidAmount,
      receipt,
      notes: {
        listing_id: listingId,
        user_id: userId,
        type: type,
        listing_title: listing.title,
      },
    });

    if (!orderResult.success) {
      return res.status(500).json({ error: 'Failed to create payment order' });
    }

    // Store payment order in database
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .insert([
        {
          order_id: orderResult.order.id,
          user_id: userId,
          listing_id: listingId,
          amount: bidAmount,
          currency: 'INR',
          status: 'created',
          type: type,
          receipt: receipt,
          created_at: new Date().toISOString(),
        }
      ])
      .select()
      .single();

    if (paymentError) {
      console.error('Error storing payment record:', paymentError);
      // Continue anyway, as Razorpay order is created
    }

    res.json({
      success: true,
      order: orderResult.order,
      key_id: process.env.RAZORPAY_KEY_ID,
      amount: bidAmount,
      currency: 'INR',
      name: 'Auction House',
      description: `Payment for ${listing.title}`,
      prefill: {
        name: req.user.fullName,
        email: req.user.email,
      },
      theme: {
        color: '#3B82F6',
      },
    });
  } catch (error) {
    console.error('Payment order creation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify payment and complete transaction
router.post('/verify-payment', requireAuth, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      listingId,
      bidAmount,
    } = req.body;
    const userId = req.user.id;

    console.log('Verifying payment:', {
      razorpay_order_id,
      razorpay_payment_id,
      listingId,
      bidAmount,
      userId,
    });

    // Verify payment signature
    const isValidSignature = razorpayService.verifyPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValidSignature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Get payment details from Razorpay
    const paymentResult = await razorpayService.getPayment(razorpay_payment_id);
    if (!paymentResult.success) {
      return res.status(500).json({ error: 'Failed to fetch payment details' });
    }

    const payment = paymentResult.payment;

    // Update payment record in database
    const { error: updatePaymentError } = await supabase
      .from('payments')
      .update({
        payment_id: razorpay_payment_id,
        status: payment.status,
        method: payment.method,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', razorpay_order_id);

    if (updatePaymentError) {
      console.error('Error updating payment record:', updatePaymentError);
    }

    // If payment is successful, place the bid
    if (payment.status === 'captured') {
      // Place the bid (similar to existing bid logic)
      const { data: newBid, error: bidError } = await supabase
        .from('bids')
        .insert([
          {
            listing_id: listingId,
            bidder_id: userId,
            amount: bidAmount,
            payment_id: razorpay_payment_id,
            created_at: new Date().toISOString(),
            is_winning: true,
          }
        ])
        .select()
        .single();

      if (bidError) {
        console.error('Error placing bid after payment:', bidError);
        return res.status(500).json({ error: 'Payment successful but failed to place bid' });
      }

      // Update listing's current bid
      const { error: updateListingError } = await supabase
        .from('listings')
        .update({
          current_bid: bidAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', listingId);

      if (updateListingError) {
        console.error('Error updating listing:', updateListingError);
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

      res.json({
        success: true,
        message: 'Payment verified and bid placed successfully',
        payment: {
          id: razorpay_payment_id,
          status: payment.status,
          amount: payment.amount / 100, // Convert from paise
        },
        bid: newBid,
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Payment not captured',
        status: payment.status,
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create seller listing fee payment
router.post('/create-listing-fee-order', requireAuth, async (req, res) => {
  try {
    const { productId, listingFee = 100 } = req.body; // Default listing fee of ₹100
    const userId = req.user.id;

    console.log('Creating listing fee order:', { productId, listingFee, userId });

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Verify product exists and belongs to user
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('seller_id', userId)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Product not found or not owned by user' });
    }

    // Create unique receipt ID (max 40 characters for Razorpay)
    const timestamp = Date.now().toString().slice(-8); // Last 8 digits
    const shortProductId = productId.slice(-8); // Last 8 characters
    const shortUserId = userId.slice(-8); // Last 8 characters
    const receipt = `fee_${shortProductId}_${shortUserId}_${timestamp}`;

    // Create Razorpay order
    const orderResult = await razorpayService.createOrder({
      amount: listingFee,
      receipt,
      notes: {
        product_id: productId,
        user_id: userId,
        type: 'listing_fee',
        product_name: product.name,
      },
    });

    if (!orderResult.success) {
      return res.status(500).json({ error: 'Failed to create payment order' });
    }

    // Store payment order in database
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .insert([
        {
          order_id: orderResult.order.id,
          user_id: userId,
          product_id: productId,
          amount: listingFee,
          currency: 'INR',
          status: 'created',
          type: 'listing_fee',
          receipt: receipt,
          created_at: new Date().toISOString(),
        }
      ])
      .select()
      .single();

    if (paymentError) {
      console.error('Error storing payment record:', paymentError);
    }

    res.json({
      success: true,
      order: orderResult.order,
      key_id: process.env.RAZORPAY_KEY_ID,
      amount: listingFee,
      currency: 'INR',
      name: 'Auction House',
      description: `Listing fee for ${product.name}`,
      prefill: {
        name: req.user.fullName,
        email: req.user.email,
      },
      theme: {
        color: '#3B82F6',
      },
    });
  } catch (error) {
    console.error('Listing fee order creation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's payment history
router.get('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, type, status, dateFrom, dateTo } = req.query;

    console.log('Fetching payment history for user:', userId);

    // First, get the basic payments data
    let query = supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: payments, error, count } = await query;

    if (error) {
      console.error('Error fetching payment history:', error);
      return res.status(500).json({ error: 'Failed to fetch payment history' });
    }

    // Enhance payments with related data
    const enhancedPayments = await Promise.all(
      (payments || []).map(async (payment) => {
        let enhancedPayment = { ...payment };

        // Get listing info if listing_id exists
        if (payment.listing_id) {
          try {
            const { data: listing } = await supabase
              .from('listings')
              .select('title, status')
              .eq('id', payment.listing_id)
              .single();
            
            if (listing) {
              enhancedPayment.listingTitle = listing.title;
              enhancedPayment.listingStatus = listing.status;
            }
          } catch (error) {
            console.warn('Could not fetch listing for payment:', payment.id);
          }
        }

        // Get product info if product_id exists
        if (payment.product_id) {
          try {
            const { data: product } = await supabase
              .from('products')
              .select('name')
              .eq('id', payment.product_id)
              .single();
            
            if (product) {
              enhancedPayment.productName = product.name;
            }
          } catch (error) {
            console.warn('Could not fetch product for payment:', payment.id);
          }
        }

        return enhancedPayment;
      })
    );

    console.log('Successfully fetched payment history:', {
      total: count || 0,
      returned: enhancedPayments.length
    });

    res.json({
      payments: enhancedPayments,
      total: count || 0,
      page: parseInt(page),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    });
  } catch (error) {
    console.error('Payment history fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create payment order for completed purchase (auction winner payment)
router.post('/create-purchase-order', requireAuth, async (req, res) => {
  try {
    const { purchaseId, amount, listingId, productName } = req.body;
    const userId = req.user.id;

    console.log('Creating purchase payment order:', { purchaseId, amount, listingId, productName, userId });

    if (!purchaseId || !amount || !listingId) {
      return res.status(400).json({ error: 'Purchase ID, amount, and listing ID are required' });
    }

    // Verify the user is the winner of this auction
    console.log('Querying for listing and winning bid:', { listingId, userId });
    
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select(`
        id,
        title,
        status,
        current_bid,
        seller_id
      `)
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      console.error('Listing query error:', listingError);
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Get the winning bid separately for better control
    const { data: winningBid, error: bidError } = await supabase
      .from('bids')
      .select('id, bidder_id, amount, is_winning')
      .eq('listing_id', listingId)
      .eq('bidder_id', userId)
      .eq('is_winning', true)
      .single();

    if (bidError || !winningBid) {
      console.error('Winning bid query error:', bidError);
      console.log('Query parameters:', { listingId, userId });
      return res.status(404).json({ error: 'You are not the winner of this auction' });
    }

    console.log('Found listing and bid:', {
      listingId: listing.id,
      listingTitle: listing.title,
      bidId: winningBid.id,
      bidAmount: winningBid.amount,
      bidAmountType: typeof winningBid.amount,
      bidderId: winningBid.bidder_id,
      isWinning: winningBid.is_winning
    });

    // Verify the amount matches the winning bid (handle type conversion and precision)
    const bidAmount = parseFloat(winningBid.amount);
    const paymentAmount = parseFloat(amount);
    
    console.log('Amount validation:', {
      bidAmount,
      paymentAmount,
      bidAmountType: typeof winningBid.amount,
      paymentAmountType: typeof amount,
      difference: Math.abs(bidAmount - paymentAmount),
      match: Math.abs(bidAmount - paymentAmount) < 0.01
    });
    
    if (Math.abs(bidAmount - paymentAmount) >= 0.01) {
      return res.status(400).json({ 
        error: 'Payment amount does not match winning bid',
        details: {
          expectedAmount: bidAmount,
          providedAmount: paymentAmount,
          difference: Math.abs(bidAmount - paymentAmount)
        }
      });
    }

    // Create unique receipt ID (max 40 characters for Razorpay)
    const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
    const shortPurchaseId = purchaseId.slice(-8); // Last 8 characters of purchase ID
    const shortUserId = userId.slice(-8); // Last 8 characters of user ID
    const receipt = `pur_${shortPurchaseId}_${shortUserId}_${timestamp}`;
    
    console.log('Generated receipt ID:', {
      receipt,
      length: receipt.length,
      maxLength: 40,
      valid: receipt.length <= 40
    });

    // Create Razorpay order
    const orderResult = await razorpayService.createOrder({
      amount: amount,
      receipt,
      notes: {
        purchase_id: purchaseId,
        listing_id: listingId,
        user_id: userId,
        type: 'purchase_payment',
        product_name: productName || listing.title,
      },
    });

    if (!orderResult.success) {
      return res.status(500).json({ error: 'Failed to create payment order' });
    }

    // Store payment order in database
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .insert([
        {
          order_id: orderResult.order.id,
          user_id: userId,
          listing_id: listingId,
          amount: amount,
          currency: 'INR',
          status: 'created',
          type: 'purchase_payment',
          receipt: receipt,
          created_at: new Date().toISOString(),
        }
      ])
      .select()
      .single();

    if (paymentError) {
      console.error('Error storing payment record:', paymentError);
      // Continue anyway, as Razorpay order is created
    }

    res.json({
      success: true,
      order: orderResult.order,
      key_id: process.env.RAZORPAY_KEY_ID,
      amount: amount,
      currency: 'INR',
      name: 'Auction House',
      description: `Purchase payment for ${productName || listing.title}`,
      prefill: {
        name: req.user.fullName,
        email: req.user.email,
      },
      theme: {
        color: '#3B82F6',
      },
    });
  } catch (error) {
    console.error('Purchase payment order creation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify purchase payment and complete transaction
router.post('/verify-purchase-payment', requireAuth, async (req, res) => {
  console.log('=== PURCHASE PAYMENT VERIFICATION STARTED ===');
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      purchaseId,
    } = req.body;
    const userId = req.user.id;

    console.log('Payment verification request received:', {
      razorpay_order_id,
      razorpay_payment_id,
      purchaseId,
      userId,
      hasSignature: !!razorpay_signature
    });

    // Verify payment signature
    const isValidSignature = razorpayService.verifyPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValidSignature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Get payment details from Razorpay
    const paymentResult = await razorpayService.getPayment(razorpay_payment_id);
    if (!paymentResult.success) {
      return res.status(500).json({ error: 'Failed to fetch payment details' });
    }

    const payment = paymentResult.payment;

    // Update payment record in database
    const { data: updatedPayment, error: updatePaymentError } = await supabase
      .from('payments')
      .update({
        payment_id: razorpay_payment_id,
        status: payment.status,
        method: payment.method,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', razorpay_order_id)
      .select()
      .single();

    if (updatePaymentError) {
      console.error('Error updating payment record:', updatePaymentError);
      return res.status(500).json({ error: 'Failed to update payment record' });
    }

    // If payment is successful, complete the ownership transfer
    if (payment.status === 'captured') {
      const listingId = updatedPayment.listing_id;
      
      // Get the listing and original product details
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select(`
          *,
          products!inner(*)
        `)
        .eq('id', listingId)
        .single();

      if (listingError || !listing) {
        console.error('Error fetching listing for ownership transfer:', listingError);
        return res.status(500).json({ error: 'Failed to fetch listing details' });
      }

      // Check if ownership has already been transferred
      const { data: existingProduct, error: existingProductError } = await supabase
        .from('products')
        .select('id')
        .eq('seller_id', userId)
        .eq('name', listing.title)
        .single();

      if (!existingProduct || existingProductError) {
        console.log(`Processing ownership transfer for purchase payment: ${listing.title}`);
        
        const now = new Date();
        
        // Create a new product entry for the buyer (new owner)
        const { data: newProduct, error: newProductError } = await supabase
          .from('products')
          .insert([{
            name: listing.products.name,
            description: listing.products.description,
            base_price: updatedPayment.amount, // Set new base price to what they paid
            category_id: listing.products.category_id,
            image_url: listing.products.image_url,
            seller_id: userId, // New owner
            status: 'active',
            created_at: now.toISOString(),
            updated_at: now.toISOString()
          }])
          .select()
          .single();

        if (newProductError) {
          console.error(`Error creating new product for buyer:`, newProductError);
          return res.status(500).json({ error: 'Payment successful but ownership transfer failed' });
        } else {
          console.log(`✅ Created new product ${newProduct.id} for buyer ${userId}`);
          
          // Mark the original product as inactive
          const { error: originalProductError } = await supabase
            .from('products')
            .update({ 
              status: 'inactive',
              updated_at: now.toISOString()
            })
            .eq('id', listing.product_id);

          if (originalProductError) {
            console.error(`Error updating original product status:`, originalProductError);
          } else {
            console.log(`✅ Marked original product ${listing.product_id} as inactive`);
          }

          // Track ownership transfer in a simple way using the purchases table
          // This creates a record that can be used to build ownership history
          const { error: purchaseError } = await supabase
            .from('purchases')
            .insert([{
              user_id: userId,
              listing_id: listingId,
              product_id: listing.product_id,
              product_name: listing.title,
              product_image: listing.products.image_url,
              category: listing.products.category_id || 'General',
              final_price: updatedPayment.amount,
              seller_name: 'Previous Owner', // We can enhance this later
              auction_end_date: listing.end_date,
              payment_id: razorpay_payment_id,
              created_at: now.toISOString(),
              updated_at: now.toISOString()
            }]);

          if (purchaseError) {
            console.error('Error creating purchase record:', purchaseError);
          } else {
            console.log('✅ Created purchase record for ownership tracking');
            
            // Also create/update customer record
            try {
              const { data: buyer, error: buyerError } = await supabase
                .from('users')
                .select('id, full_name, email')
                .eq('id', userId)
                .single();

              if (!buyerError && buyer) {
                // Try to create/update customer record in the customers table
                const { data: existingCustomer, error: fetchCustomerError } = await supabase
                  .from('customers')
                  .select('*')
                  .eq('seller_id', listing.seller_id)
                  .eq('customer_id', userId)
                  .single();

                const now = new Date().toISOString();

                if (existingCustomer && !fetchCustomerError) {
                  // Update existing customer
                  await supabase
                    .from('customers')
                    .update({
                      last_purchase_date: now,
                      total_orders: existingCustomer.total_orders + 1,
                      total_spent: parseFloat(existingCustomer.total_spent || 0) + parseFloat(updatedPayment.amount),
                      favorite_category: listing.products.category_id || 'General',
                      updated_at: now
                    })
                    .eq('id', existingCustomer.id);
                  
                  console.log('✅ Updated existing customer record');
                } else {
                  // Create new customer
                  await supabase
                    .from('customers')
                    .insert([{
                      seller_id: listing.seller_id,
                      customer_id: userId,
                      customer_name: buyer.full_name,
                      customer_email: buyer.email,
                      first_purchase_date: now,
                      last_purchase_date: now,
                      total_orders: 1,
                      total_spent: parseFloat(updatedPayment.amount),
                      favorite_category: listing.products.category_id || 'General',
                      created_at: now,
                      updated_at: now
                    }]);
                  
                  console.log('✅ Created new customer record');
                }
              }
            } catch (customerError) {
              console.warn('Could not create/update customer record (table may not exist):', customerError);
              // This is not critical, so we don't fail the payment
            }
          }
        }
      } else {
        console.log(`Ownership already transferred for purchase: ${listing.title}`);
      }

      res.json({
        success: true,
        message: 'Purchase payment completed successfully',
        payment: {
          id: razorpay_payment_id,
          status: payment.status,
          amount: payment.amount / 100,
        },
        ownershipTransferred: true,
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Payment not captured',
        status: payment.status,
      });
    }
  } catch (error) {
    console.error('Purchase payment verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Test route right before analytics
router.get('/analytics-test', (req, res) => {
  console.log('🧪 ANALYTICS TEST ENDPOINT HIT');
  res.json({ message: 'Analytics test endpoint working!' });
});

// Get payment analytics/summary - REAL DATABASE VERSION
router.get('/analytics', requireAuth, async (req, res) => {
  console.log('🚀 ANALYTICS ENDPOINT HIT - USER:', req.user?.id || 'NO USER');
  
  try {
    const userId = req.user.id;
    const { period = '30d' } = req.query;
    
    // Calculate date range based on period
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
    
    console.log('📅 Fetching analytics for period:', period, 'from:', startDate.toISOString());
    
    // Fetch all payments for the user
    const { data: allPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (paymentsError) {
      console.error('❌ Error fetching payments:', paymentsError);
      throw paymentsError;
    }

    console.log('💳 Found payments:', allPayments?.length || 0);

    // Fetch seller purchases (earnings from sales)
    const { data: sellerPurchases, error: purchasesError } = await supabase
      .from('purchases')
      .select(`
        *,
        listings!inner(seller_id)
      `)
      .eq('listings.seller_id', userId)
      .eq('is_paid', true)
      .gte('created_at', startDate.toISOString());

    if (purchasesError) {
      console.error('❌ Error fetching seller purchases:', purchasesError);
    }

    console.log('🛒 Found seller purchases:', sellerPurchases?.length || 0);

    const payments = allPayments || [];
    const earnings = sellerPurchases || [];
    
    // Calculate statistics
    const totalPayments = payments.length;
    const successfulPayments = payments.filter(p => p.status === 'captured' || p.status === 'completed').length;
    const failedPayments = payments.filter(p => p.status === 'failed').length;
    const pendingPayments = payments.filter(p => p.status === 'created' || p.status === 'pending').length;
    
    const totalAmount = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const totalEarnings = earnings.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    
    // Calculate this month earnings
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEarnings = earnings
      .filter(e => new Date(e.created_at) >= thisMonthStart)
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    
    const averageTransactionValue = totalPayments > 0 ? totalAmount / totalPayments : 0;
    
    // Group by type
    const byType = payments.reduce((acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + 1;
      return acc;
    }, {});
    
    // Group by method
    const byMethod = payments.reduce((acc, p) => {
      if (p.method) {
        acc[p.method] = (acc[p.method] || 0) + 1;
      }
      return acc;
    }, {});
    
    // Recent transactions (last 10)
    const recentTransactions = payments.slice(0, 10).map(p => ({
      id: p.id,
      amount: parseFloat(p.amount) || 0,
      status: p.status,
      type: p.type,
      method: p.method,
      createdAt: p.created_at,
      productName: `Transaction #${p.id?.slice(-6) || 'unknown'}`
    }));
    
    const analyticsData = {
      totalPayments,
      totalAmount,
      successfulPayments,
      failedPayments,
      pendingPayments,
      totalEarnings,
      thisMonthEarnings,
      averageTransactionValue,
      byType,
      byMethod,
      recentTransactions,
      monthlyTrend: [] // TODO: Implement monthly trend calculation
    };
    
    console.log('📊 Returning analytics data:', {
      totalPayments: analyticsData.totalPayments,
      totalEarnings: analyticsData.totalEarnings,
      successfulPayments: analyticsData.successfulPayments
    });
    
    res.json(analyticsData);
    
  } catch (error) {
    console.error('💥 Analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Test endpoint to verify routes are working
router.get('/test', (req, res) => {
  console.log('Test endpoint called');
  res.json({ message: 'Payment routes are working!' });
});

export default router;