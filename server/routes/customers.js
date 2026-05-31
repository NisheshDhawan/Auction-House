import express from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';

console.log('=== CUSTOMERS ROUTES FILE LOADED ===');

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

// Test route
router.get('/test', (req, res) => {
  console.log('=== CUSTOMERS TEST ROUTE HIT ===');
  res.json({ message: 'Customers routes are working!' });
});

// Get seller's customer statistics
router.get('/seller/:sellerId/stats', requireAuth, async (req, res) => {
  try {
    const { sellerId } = req.params;
    
    console.log('📊 Fetching customer statistics for seller:', sellerId);
    
    // Get customers data
    const { data: customers, error } = await supabase
      .from('customers')
      .select('total_orders, total_spent')
      .eq('seller_id', sellerId);

    if (error) {
      console.error('Error fetching customer stats:', error);
      return res.json({
        totalCustomers: 0,
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0
      });
    }

    const stats = {
      totalCustomers: customers?.length || 0,
      totalRevenue: customers?.reduce((sum, c) => sum + parseFloat(c.total_spent || 0), 0) || 0,
      totalOrders: customers?.reduce((sum, c) => sum + (c.total_orders || 0), 0) || 0,
      averageOrderValue: 0
    };

    // Calculate average order value
    if (stats.totalOrders > 0) {
      stats.averageOrderValue = stats.totalRevenue / stats.totalOrders;
    }

    console.log('📊 Customer statistics calculated:', stats);

    res.json(stats);

  } catch (error) {
    console.error('Customer stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get seller's customers
router.get('/seller/:sellerId', requireAuth, async (req, res) => {
  console.log('🔥 CUSTOMERS ROUTE CALLED!');
  console.log('Seller ID:', req.params.sellerId);
  console.log('Authenticated user:', req.user?.id);
  
  try {
    const { sellerId } = req.params;
    
    console.log('=== CUSTOMERS API DEBUG ===');
    console.log('Fetching customers for seller:', sellerId);
    console.log('Authenticated user:', req.user);
    
    // First try to get customers from the customers table with category names
    let customers, error;
    
    try {
      // Try to get customers with category names
      const result = await supabase
        .from('customers')
        .select(`
          *,
          categories(name)
        `)
        .eq('seller_id', sellerId)
        .order('total_spent', { ascending: false });
      
      customers = result.data;
      error = result.error;
    } catch (categoryError) {
      console.log('Categories table not available, fetching customers without category names');
      
      // Fallback: get customers without category relationship
      const result = await supabase
        .from('customers')
        .select('*')
        .eq('seller_id', sellerId)
        .order('total_spent', { ascending: false });
      
      customers = result.data;
      error = result.error;
    }

    console.log('Customers table query result:', { customers: customers?.length || 0, error });

    if (!error && customers && customers.length > 0) {
      console.log('Found customers in customers table:', customers);
      
      // Transform to match frontend interface
      const transformedCustomers = customers.map(customer => {
        let categoryName = 'General'; // Default
        
        // Try to get category name from different sources
        if (customer.categories?.name) {
          categoryName = customer.categories.name;
        } else if (customer.favorite_category) {
          // If it's a UUID, try to resolve it, otherwise use as-is
          if (customer.favorite_category.length === 36 && customer.favorite_category.includes('-')) {
            categoryName = 'Digital Art'; // Default for UUID categories
          } else {
            categoryName = customer.favorite_category;
          }
        }
        
        return {
          id: customer.id,
          sellerId: customer.seller_id,
          customerId: customer.customer_id,
          customerName: customer.customer_name,
          customerEmail: customer.customer_email,
          firstPurchaseDate: customer.first_purchase_date,
          lastPurchaseDate: customer.last_purchase_date,
          totalOrders: customer.total_orders,
          totalSpent: parseFloat(customer.total_spent || 0),
          favoriteCategory: categoryName
        };
      });

      console.log('Returning customers from customers table:', transformedCustomers.length);
      console.log('Sample transformed customer:', transformedCustomers[0]);
      
      return res.json({
        customers: transformedCustomers,
        total: transformedCustomers.length
      });
    }

    // If customers table doesn't exist or is empty, build customer data from purchases and payments
    console.log('Customers table empty or not available, building from purchase data...');
    
    // Get all successful payments for this seller's listings
    const { data: sellerListings, error: listingsError } = await supabase
      .from('listings')
      .select('id, title, seller_id')
      .eq('seller_id', sellerId);

    if (listingsError || !sellerListings) {
      console.error('Error fetching seller listings:', listingsError);
      return res.json({ customers: [], total: 0 });
    }

    const listingIds = sellerListings.map(l => l.id);
    console.log('Seller listing IDs:', listingIds);
    
    if (listingIds.length === 0) {
      console.log('No listings found for seller');
      return res.json({ customers: [], total: 0 });
    }

    // Get all successful payments for these listings
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        user_id,
        listing_id,
        amount,
        status,
        created_at,
        type
      `)
      .in('listing_id', listingIds)
      .eq('status', 'captured')
      .eq('type', 'purchase_payment')
      .order('created_at', { ascending: true });

    if (paymentsError || !payments) {
      console.error('Error fetching payments:', paymentsError);
      return res.json({ customers: [], total: 0 });
    }

    console.log('Found successful payments:', payments.length);
    if (payments.length > 0) {
      console.log('Sample payment:', payments[0]);
    }

    // Group payments by customer (user_id)
    const customerMap = new Map();
    
    for (const payment of payments) {
      const customerId = payment.user_id;
      
      if (!customerMap.has(customerId)) {
        // Get customer details
        const { data: customerUser, error: userError } = await supabase
          .from('users')
          .select('id, full_name, email')
          .eq('id', customerId)
          .single();

        if (!userError && customerUser) {
          customerMap.set(customerId, {
            id: `customer_${customerId}`,
            sellerId: sellerId,
            customerId: customerId,
            customerName: customerUser.full_name,
            customerEmail: customerUser.email,
            firstPurchaseDate: payment.created_at,
            lastPurchaseDate: payment.created_at,
            totalOrders: 1,
            totalSpent: parseFloat(payment.amount),
            favoriteCategory: 'Digital Art' // Default category
          });
        }
      } else {
        // Update existing customer data
        const customer = customerMap.get(customerId);
        customer.lastPurchaseDate = payment.created_at;
        customer.totalOrders += 1;
        customer.totalSpent += parseFloat(payment.amount);
      }
    }

    const customersArray = Array.from(customerMap.values());
    
    // Sort by total spent (highest first)
    customersArray.sort((a, b) => b.totalSpent - a.totalSpent);

    console.log('Built customer data from payments:', customersArray.length);
    if (customersArray.length > 0) {
      console.log('Sample customer:', customersArray[0]);
    }
    console.log('=== END CUSTOMERS API DEBUG ===');

    res.json({
      customers: customersArray,
      total: customersArray.length
    });

  } catch (error) {
    console.error('Customers fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add or update customer
router.post('/', requireAuth, async (req, res) => {
  try {
    const { sellerId, customerId, customerName, customerEmail, orderAmount, category } = req.body;
    
    console.log('Adding/updating customer:', {
      sellerId,
      customerId,
      customerName,
      orderAmount,
      category
    });

    if (!sellerId || !customerId || !customerName || !orderAmount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if customer already exists
    const { data: existingCustomer, error: fetchError } = await supabase
      .from('customers')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('customer_id', customerId)
      .single();

    const now = new Date().toISOString();

    if (existingCustomer && !fetchError) {
      // Update existing customer
      const { data: updatedCustomer, error: updateError } = await supabase
        .from('customers')
        .update({
          last_purchase_date: now,
          total_orders: existingCustomer.total_orders + 1,
          total_spent: parseFloat(existingCustomer.total_spent || 0) + parseFloat(orderAmount),
          favorite_category: category, // Simple logic: last category becomes favorite
          updated_at: now
        })
        .eq('id', existingCustomer.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating customer:', updateError);
        return res.status(500).json({ error: 'Failed to update customer' });
      }

      // Transform response
      const transformedCustomer = {
        id: updatedCustomer.id,
        sellerId: updatedCustomer.seller_id,
        customerId: updatedCustomer.customer_id,
        customerName: updatedCustomer.customer_name,
        customerEmail: updatedCustomer.customer_email,
        firstPurchaseDate: updatedCustomer.first_purchase_date,
        lastPurchaseDate: updatedCustomer.last_purchase_date,
        totalOrders: updatedCustomer.total_orders,
        totalSpent: parseFloat(updatedCustomer.total_spent || 0),
        favoriteCategory: updatedCustomer.favorite_category
      };

      res.json(transformedCustomer);
    } else {
      // Create new customer
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert([{
          seller_id: sellerId,
          customer_id: customerId,
          customer_name: customerName,
          customer_email: customerEmail,
          first_purchase_date: now,
          last_purchase_date: now,
          total_orders: 1,
          total_spent: parseFloat(orderAmount),
          favorite_category: category,
          created_at: now,
          updated_at: now
        }])
        .select()
        .single();

      if (createError) {
        console.error('Error creating customer:', createError);
        return res.status(500).json({ error: 'Failed to create customer' });
      }

      // Transform response
      const transformedCustomer = {
        id: newCustomer.id,
        sellerId: newCustomer.seller_id,
        customerId: newCustomer.customer_id,
        customerName: newCustomer.customer_name,
        customerEmail: newCustomer.customer_email,
        firstPurchaseDate: newCustomer.first_purchase_date,
        lastPurchaseDate: newCustomer.last_purchase_date,
        totalOrders: newCustomer.total_orders,
        totalSpent: parseFloat(newCustomer.total_spent || 0),
        favoriteCategory: newCustomer.favorite_category
      };

      res.json(transformedCustomer);
    }
  } catch (error) {
    console.error('Customer add/update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get customer's purchased products from a specific seller
router.get('/seller/:sellerId/customer/:customerId/products', requireAuth, async (req, res) => {
  try {
    const { sellerId, customerId } = req.params;
    
    console.log('Fetching purchased products for customer:', customerId, 'from seller:', sellerId);
    
    // Get seller's listings
    const { data: sellerListings, error: listingsError } = await supabase
      .from('listings')
      .select(`
        id,
        title,
        seller_id,
        product_id,
        products!inner(
          name, 
          description, 
          category_id, 
          image_url,
          categories(name)
        )
      `)
      .eq('seller_id', sellerId);

    if (listingsError || !sellerListings) {
      console.error('Error fetching seller listings:', listingsError);
      return res.json({ products: [] });
    }

    const listingIds = sellerListings.map(l => l.id);
    
    if (listingIds.length === 0) {
      return res.json({ products: [] });
    }

    // Get successful payments by this customer for these listings
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        listing_id,
        amount,
        created_at,
        payment_id
      `)
      .in('listing_id', listingIds)
      .eq('user_id', customerId)
      .eq('status', 'captured')
      .eq('type', 'purchase_payment')
      .order('created_at', { ascending: false });

    if (paymentsError || !payments) {
      console.error('Error fetching customer payments:', paymentsError);
      return res.json({ products: [] });
    }

    // Build product list with purchase details
    const products = payments.map(payment => {
      const listing = sellerListings.find(l => l.id === payment.listing_id);
      
      return {
        id: `product_${payment.id}`,
        name: listing?.products?.name || listing?.title || 'Unknown Product',
        image: listing?.products?.image_url || '/placeholder-product.jpg',
        category: listing?.products?.categories?.name || listing?.products?.category_id || 'General',
        purchasePrice: parseFloat(payment.amount),
        purchaseDate: payment.created_at,
        auctionId: payment.listing_id,
        paymentId: payment.payment_id
      };
    });

    console.log('Found purchased products:', products.length);

    res.json({ products });

  } catch (error) {
    console.error('Customer products fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;