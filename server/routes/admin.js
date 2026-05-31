import express from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';

console.log('=== ADMIN ROUTES FILE LOADED ===');

const router = express.Router();

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    console.log('=== REQUIRE ADMIN MIDDLEWARE CALLED ===');
    console.log('Admin middleware called for:', req.path);
    console.log('Authorization header:', req.headers.authorization);
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No valid authorization header found');
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    console.log('Token extracted:', token.substring(0, 20) + '...');
    
    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('JWT decoded successfully:', decoded);
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError.message);
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user role from database using the decoded userId
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .eq('id', decoded.userId)
      .single();

    console.log('User lookup result:', userData, userError);

    if (userError || !userData) {
      console.error('User lookup error:', userError);
      return res.status(401).json({ error: 'User not found' });
    }

    if (userData.role !== 'admin') {
      console.log('User is not admin:', userData.role);
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log('Admin access granted for user:', userData.email);

    // Add user data to request object
    req.user = {
      id: userData.id,
      email: userData.email,
      fullName: userData.full_name,
      role: userData.role
    };
    
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Test products count endpoint
router.get('/products-count-test', requireAdmin, async (req, res) => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('id');
    
    res.json({
      count: products?.length || 0,
      error: error?.message || null,
      products: products || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Simple test endpoint
router.get('/test-simple', (req, res) => {
  res.json({ message: 'Admin test endpoint works', products: 2 });
});

// Test endpoint to check products count
router.get('/test-products-count', requireAdmin, async (req, res) => {
  try {
    console.log('=== TEST PRODUCTS COUNT ENDPOINT CALLED ===');
    
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, status');
    
    console.log('Products found:', products?.length);
    console.log('Error:', error);
    
    res.json({
      count: products?.length || 0,
      products: products || [],
      error: error?.message || null
    });
  } catch (error) {
    console.error('Test products count error:', error);
    res.status(500).json({ error: 'Failed to count products' });
  }
});

// Debug: check all payment statuses in DB
router.get('/dashboard/debug-payments', requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('payments').select('id, amount, status, type, created_at');
  res.json({ data, error, count: data?.length });
});

// Get dashboard statistics
router.get('/dashboard/stats', requireAdmin, async (req, res) => {
  try {
    console.log('=== DASHBOARD STATS ENDPOINT CALLED ===');
    
    // Execute all queries in parallel for better performance
    const [
      usersResult,
      requestsResult,
      categoriesResult,
      listingsResult,
      productsResult,
      paymentsResult,
      ordersResult
    ] = await Promise.all([
      // Get total users count
      supabase.from('users').select('*', { count: 'exact', head: true }),
      
      // Get pending category requests count
      supabase.from('category_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      
      // Get total categories count
      supabase.from('categories').select('*', { count: 'exact', head: true }),
      
      // Get active listings count
      supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      
      // Get total products count - use count instead of fetching all
      supabase.from('products').select('*', { count: 'exact', head: true }),
      
      // Get total revenue from purchases (source of truth for completed transactions)
      supabase.from('purchases').select('final_price'),
      
      // Get total orders count
      supabase.from('purchases').select('*', { count: 'exact', head: true })
    ]);

    const totalUsers = usersResult.count || 0;
    const pendingRequests = requestsResult.count || 0;
    const totalCategories = categoriesResult.count || 0;
    const activeListings = listingsResult.count || 0;
    const totalProducts = productsResult.count || 0;
    const totalOrders = ordersResult.count || 0;
    
    // Calculate revenue from completed purchases
    const revenue = paymentsResult.error ? 0 : 
      (paymentsResult.data?.reduce((sum, p) => sum + parseFloat(p.final_price || 0), 0) || 0);

    const stats = {
      totalUsers,
      totalProducts,
      activeListings,
      totalOrders,
      revenue: Math.round(revenue),
      pendingRequests,
      totalCategories
    };

    console.log('=== FINAL STATS ===', stats);
    res.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics', details: error.message });
  }
});

// Get recent activities
router.get('/dashboard/activities', requireAdmin, async (req, res) => {
  try {
    console.log('=== DASHBOARD ACTIVITIES ENDPOINT CALLED ===');
    
    // Execute all queries in parallel with limits
    const [usersResult, requestsResult, bidsResult] = await Promise.all([
      // Get recent user registrations (limit 3)
      supabase
        .from('users')
        .select('full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(3),
      
      // Get recent category requests (limit 3)
      supabase
        .from('category_requests')
        .select('id, name, status, created_at, users:requested_by (full_name)')
        .order('created_at', { ascending: false })
        .limit(3),
      
      // Get recent bids (limit 4)
      supabase
        .from('bids')
        .select('id, amount, created_at, users:bidder_id (full_name), listings:listing_id (title)')
        .order('created_at', { ascending: false })
        .limit(4)
    ]);

    const activities = [];

    // Process users
    if (!usersResult.error && usersResult.data) {
      usersResult.data.forEach(user => {
        activities.push({
          id: `user_${user.full_name}_${user.created_at}`,
          type: 'user_registered',
          message: `New user ${user.full_name} registered`,
          time: getTimeAgo(user.created_at),
          timestamp: new Date(user.created_at).getTime(),
          status: 'success'
        });
      });
    }

    // Process category requests
    if (!requestsResult.error && requestsResult.data) {
      requestsResult.data.forEach(request => {
        activities.push({
          id: `request_${request.id}`,
          type: 'category_requested',
          message: `New category "${request.name}" requested by ${request.users?.full_name || 'Unknown'}`,
          time: getTimeAgo(request.created_at),
          timestamp: new Date(request.created_at).getTime(),
          status: request.status === 'pending' ? 'warning' : request.status === 'approved' ? 'success' : 'error'
        });
      });
    }

    // Process bids
    if (!bidsResult.error && bidsResult.data) {
      bidsResult.data.forEach(bid => {
        activities.push({
          id: `bid_${bid.id}`,
          type: 'bid_placed',
          message: `${bid.users?.full_name || 'User'} placed bid of ₹${bid.amount} on "${bid.listings?.title || 'listing'}"`,
          time: getTimeAgo(bid.created_at),
          timestamp: new Date(bid.created_at).getTime(),
          status: 'info'
        });
      });
    }

    // Sort by timestamp (most recent first) and return top 10
    activities.sort((a, b) => b.timestamp - a.timestamp);
    const topActivities = activities.slice(0, 10).map(({ timestamp, ...rest }) => rest);

    console.log('=== TOTAL ACTIVITIES ===', topActivities.length);
    res.json(topActivities);
  } catch (error) {
    console.error('Dashboard activities error:', error);
    res.status(500).json({ error: 'Failed to fetch recent activities', details: error.message });
  }
});

// Get all users for admin management
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, email_verified, created_at, updated_at, avatar_url')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform the data to match frontend expectations
    const transformedUsers = users?.map(user => ({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      email_verified: user.email_verified,
      created_at: user.created_at,
      updated_at: user.updated_at,
      avatar: user.avatar_url // Map avatar_url to avatar for frontend compatibility
    })) || [];

    res.json(transformedUsers);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user details
router.get('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, email_verified, created_at, updated_at, avatar_url')
      .eq('id', id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Transform the data to match frontend expectations
    const transformedUser = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      email_verified: user.email_verified,
      created_at: user.created_at,
      updated_at: user.updated_at,
      avatar: user.avatar_url // Map avatar_url to avatar for frontend compatibility
    };

    res.json(transformedUser);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user details
router.put('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, role } = req.body;

    // Validate input
    if (!full_name || !email || !role) {
      return res.status(400).json({ error: 'Full name, email, and role are required' });
    }

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if email is already taken by another user
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .neq('id', id)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Email is already taken by another user' });
    }

    // Update user
    const { data, error } = await supabase
      .from('users')
      .update({ 
        full_name, 
        email, 
        role,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'User updated successfully', user: data });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Update user role (specific route - must come before general routes)
router.put('/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'User role updated successfully', user: data });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Delete user
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    console.log('DELETE /users/:id route hit with ID:', req.params.id);
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (req.user.id === id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    // Check if user exists
    const { data: user, error: checkError } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('id', id)
      .single();

    if (checkError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Change user password
router.put('/users/:id/password', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    console.log('Change password request for user:', id);

    // Validation
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user exists
    const { data: user, error: checkError } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('id', id)
      .single();

    if (checkError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash the new password
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password in database
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        password: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('Password update error:', updateError);
      throw updateError;
    }

    console.log('Password changed successfully for user:', user.email);

    res.json({ 
      message: 'Password changed successfully',
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Get all categories
router.get('/categories', requireAdmin, async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select(`
        id,
        name,
        description,
        created_at,
        updated_at,
        users:created_by (full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(categories || []);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get all category requests
router.get('/category-requests', requireAdmin, async (req, res) => {
  try {
    const { data: requests, error } = await supabase
      .from('category_requests')
      .select(`
        id,
        name,
        description,
        reason,
        status,
        created_at,
        updated_at,
        reviewed_at,
        review_notes,
        users:requested_by (full_name, email),
        reviewer:reviewed_by (full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(requests || []);
  } catch (error) {
    console.error('Get category requests error:', error);
    res.status(500).json({ error: 'Failed to fetch category requests' });
  }
});

// Test endpoint to verify token
router.get('/test-auth', requireAdmin, async (req, res) => {
  res.json({
    message: 'Authentication successful',
    user: req.user
  });
});

// ==================== CATEGORIES MANAGEMENT ====================

// Get single category details
router.get('/categories/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: category, error } = await supabase
      .from('categories')
      .select(`
        id,
        name,
        description,
        created_at,
        updated_at,
        users:created_by (full_name)
      `)
      .eq('id', id)
      .single();

    if (error || !category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// Create new category
router.post('/categories', requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Check if category already exists
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('name', name)
      .single();

    if (existingCategory) {
      return res.status(400).json({ error: 'Category already exists' });
    }

    const { data, error } = await supabase
      .from('categories')
      .insert([{
        name,
        description,
        created_by: req.user.id,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Category created successfully', category: data });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
router.put('/categories/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Check if name is already taken by another category
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('name', name)
      .neq('id', id)
      .single();

    if (existingCategory) {
      return res.status(400).json({ error: 'Category name already exists' });
    }

    const { data, error } = await supabase
      .from('categories')
      .update({
        name,
        description,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Category updated successfully', category: data });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
router.delete('/categories/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const { data: category, error: checkError } = await supabase
      .from('categories')
      .select('id, name')
      .eq('id', id)
      .single();

    if (checkError || !category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // TODO: Check if category has products before deleting
    // For now, we'll allow deletion

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ 
      message: 'Category deleted successfully', 
      deletedCategory: { id: category.id, name: category.name }
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Approve category request
router.put('/category-requests/:id/approve', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { review_notes } = req.body;

    // Get the request details
    const { data: request, error: requestError } = await supabase
      .from('category_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (requestError || !request) {
      return res.status(404).json({ error: 'Category request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request has already been processed' });
    }

    // Create the category
    const { data: newCategory, error: categoryError } = await supabase
      .from('categories')
      .insert([{
        name: request.name,
        description: request.description,
        created_by: req.user.id,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (categoryError) throw categoryError;

    // Update the request status
    const { error: updateError } = await supabase
      .from('category_requests')
      .update({
        status: 'approved',
        reviewed_by: req.user.id,
        reviewed_at: new Date().toISOString(),
        review_notes
      })
      .eq('id', id);

    if (updateError) throw updateError;

    res.json({ 
      message: 'Category request approved successfully', 
      category: newCategory 
    });
  } catch (error) {
    console.error('Approve category request error:', error);
    res.status(500).json({ error: 'Failed to approve category request' });
  }
});

// Reject category request
router.put('/category-requests/:id/reject', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { review_notes } = req.body;

    const { error } = await supabase
      .from('category_requests')
      .update({
        status: 'rejected',
        reviewed_by: req.user.id,
        reviewed_at: new Date().toISOString(),
        review_notes
      })
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Category request rejected successfully' });
  } catch (error) {
    console.error('Reject category request error:', error);
    res.status(500).json({ error: 'Failed to reject category request' });
  }
});

// Test route to debug
router.get('/debug-test', (req, res) => {
  res.json({ message: 'Debug test route works!' });
});

// ==================== LISTINGS MANAGEMENT ====================

console.log('Registering listings routes...');

// Test route
router.get('/listings-test', (req, res) => {
  res.json({ message: 'Listings test route works!' });
});

// Get all listings
router.get('/listings', requireAdmin, async (req, res) => {
  try {
    console.log('Listings route called');
    const { data: listings, error } = await supabase
      .from('listings')
      .select(`
        id,
        title,
        description,
        starting_bid,
        current_bid,
        status,
        start_date,
        end_date,
        created_at,
        updated_at,
        seller_id,
        users!seller_id (
          id,
          full_name,
          email
        ),
        products!product_id (
          id,
          name,
          categories!category_id (
            id,
            name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Listings fetched:', listings?.length || 0);
    console.log('Sample listing data:', JSON.stringify(listings?.[0], null, 2));
    
    // Transform the data to match the expected format
    const transformedListings = listings?.map(listing => ({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      starting_bid: listing.starting_bid,
      current_bid: listing.current_bid,
      status: listing.status,
      start_time: listing.start_date || listing.created_at, // Fallback to created_at if start_date is null
      end_time: listing.end_date || new Date(new Date(listing.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default to 7 days from creation
      created_at: listing.created_at,
      updated_at: listing.updated_at,
      users: listing.users,
      categories: listing.products?.categories
    })) || [];

    res.json(transformedListings);
  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// Get single listing details
router.get('/listings/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: listing, error } = await supabase
      .from('listings')
      .select(`
        id,
        title,
        description,
        starting_bid,
        current_bid,
        status,
        seller_id,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .single();

    if (error || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json(listing);
  } catch (error) {
    console.error('Get listing error:', error);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

// Update listing
router.put('/listings/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, starting_bid, status } = req.body;

    // Validate input
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (starting_bid) updateData.starting_bid = starting_bid;
    if (status) updateData.status = status;

    const { data, error } = await supabase
      .from('listings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Listing updated successfully', listing: data });
  } catch (error) {
    console.error('Update listing error:', error);
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

// Delete listing
router.delete('/listings/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if listing exists
    const { data: listing, error: checkError } = await supabase
      .from('listings')
      .select('id, title')
      .eq('id', id)
      .single();

    if (checkError || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Delete listing
    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ 
      message: 'Listing deleted successfully', 
      deletedListing: { id: listing.id, title: listing.title }
    });
  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({ error: 'Failed to delete listing' });
  }
});

// Update listing status
router.put('/listings/:id/status', requireAdmin, async (req, res) => {
  try {
    console.log(`🔍 DEBUG: Admin route called - PUT /listings/:id/status`);
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['draft', 'active', 'ended', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { data, error } = await supabase
      .from('listings')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Listing status updated successfully', listing: data });
  } catch (error) {
    console.error('Update listing status error:', error);
    res.status(500).json({ error: 'Failed to update listing status' });
  }
});

// ==================== PLACEHOLDER ROUTES FOR OTHER SECTIONS ====================
// Note: These are placeholder routes since the database tables don't exist yet

// PRODUCTS
router.get('/products', requireAdmin, async (req, res) => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        base_price,
        category_id,
        image_url,
        seller_id,
        status,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      return res.status(500).json({ error: 'Failed to fetch products' });
    }

    // Get categories to map category IDs to names
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name');
    
    const categoryMap = new Map(categories?.map(cat => [cat.id, cat.name]) || []);

    // Get users to map seller IDs to user info
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, email');
    
    const userMap = new Map(users?.map(user => [user.id, user]) || []);

    // Transform response to match admin interface
    const transformedProducts = products.map(product => {
      const user = userMap.get(product.seller_id);
      const category = categoryMap.get(product.category_id);
      
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        basePrice: parseFloat(product.base_price),
        category: category || 'Unknown Category',
        image: product.image_url,
        userId: product.seller_id,
        userName: user?.full_name || 'Unknown User',
        userEmail: user?.email || '',
        status: product.status,
        created_at: product.created_at,
        updated_at: product.updated_at,
        // Add nested objects for compatibility with existing frontend code
        categories: { name: category || 'Unknown Category' },
        users: { full_name: user?.full_name || 'Unknown User', email: user?.email || '' }
      };
    });

    res.json(transformedProducts);
  } catch (error) {
    console.error('Admin products fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.get('/products/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: product, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        base_price,
        category_id,
        image_url,
        seller_id,
        status,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .single();

    if (error || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get category name
    const { data: categoryData } = await supabase
      .from('categories')
      .select('name')
      .eq('id', product.category_id)
      .single();

    // Get user info
    const { data: userData } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', product.seller_id)
      .single();

    // Transform response to match admin interface
    const transformedProduct = {
      id: product.id,
      name: product.name,
      description: product.description,
      basePrice: parseFloat(product.base_price),
      category: categoryData?.name || 'Unknown Category',
      image: product.image_url,
      userId: product.seller_id,
      userName: userData?.full_name || 'Unknown User',
      userEmail: userData?.email || '',
      status: product.status,
      createdAt: product.created_at,
      updatedAt: product.updated_at,
      // Add nested objects for compatibility
      categories: { name: categoryData?.name || 'Unknown Category' },
      users: { full_name: userData?.full_name || 'Unknown User', email: userData?.email || '' }
    };

    res.json(transformedProduct);
  } catch (error) {
    console.error('Admin product fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

router.put('/products/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, basePrice, category, status } = req.body;

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (basePrice !== undefined) {
      const price = parseFloat(basePrice);
      if (isNaN(price) || price <= 0) {
        return res.status(400).json({ error: 'Base price must be a positive number' });
      }
      updateData.base_price = price;
    }
    if (category !== undefined) updateData.category_id = category.trim();
    if (status !== undefined) updateData.status = status;

    // Update product in database
    const { data: product, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        name,
        description,
        base_price,
        category_id,
        image_url,
        seller_id,
        status,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      console.error('Error updating product:', error);
      return res.status(500).json({ error: 'Failed to update product' });
    }

    // Get category and user info for response
    const { data: categoryData } = await supabase
      .from('categories')
      .select('name')
      .eq('id', product.category_id)
      .single();

    const { data: userData } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', product.seller_id)
      .single();

    // Transform response to match admin interface
    const transformedProduct = {
      id: product.id,
      name: product.name,
      description: product.description,
      basePrice: parseFloat(product.base_price),
      category: categoryData?.name || 'Unknown Category',
      image: product.image_url,
      userId: product.seller_id,
      userName: userData?.full_name || 'Unknown User',
      userEmail: userData?.email || '',
      status: product.status,
      createdAt: product.created_at,
      updatedAt: product.updated_at,
      // Add nested objects for compatibility
      categories: { name: categoryData?.name || 'Unknown Category' },
      users: { full_name: userData?.full_name || 'Unknown User', email: userData?.email || '' }
    };

    res.json({ message: 'Product updated successfully', product: transformedProduct });
  } catch (error) {
    console.error('Admin product update error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/products/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get product details before deletion
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('id, name')
      .eq('id', id)
      .single();

    if (fetchError || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Delete product from database
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting product:', error);
      return res.status(500).json({ error: 'Failed to delete product' });
    }

    res.json({ 
      message: 'Product deleted successfully',
      deletedProduct: { id: product.id, name: product.name }
    });
  } catch (error) {
    console.error('Admin product deletion error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ORDERS
router.get('/orders', requireAdmin, async (req, res) => {
  res.json([]);
});

router.get('/orders/:id', requireAdmin, async (req, res) => {
  res.status(404).json({ error: 'Orders table not implemented yet' });
});

router.put('/orders/:id', requireAdmin, async (req, res) => {
  res.status(501).json({ error: 'Orders update not implemented yet' });
});

router.delete('/orders/:id', requireAdmin, async (req, res) => {
  res.status(501).json({ error: 'Orders delete not implemented yet' });
});

// BIDDING HISTORY
router.get('/bidding-history', requireAdmin, async (req, res) => {
  res.json([]);
});

router.get('/bidding-history/:id', requireAdmin, async (req, res) => {
  res.status(404).json({ error: 'Bidding history table not implemented yet' });
});

router.delete('/bidding-history/:id', requireAdmin, async (req, res) => {
  res.status(501).json({ error: 'Bidding history delete not implemented yet' });
});



// Helper function to calculate time ago
function getTimeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}

export default router;