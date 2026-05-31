import express from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';
import { sendCategoryRequestStatusEmail } from '../services/emailService.js';

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('Categories auth middleware - Authorization header:', authHeader ? 'present' : 'missing');
    console.log('Categories auth middleware - Token extracted:', token ? 'present' : 'missing');

    if (!token) {
      console.log('Categories auth middleware - No token provided');
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify JWT token using our JWT_SECRET
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Categories auth middleware - JWT decoded successfully:', decoded);
    } catch (jwtError) {
      console.error('Categories auth middleware - JWT verification error:', jwtError.message);
      return res.status(403).json({ error: 'Invalid token' });
    }

    // Get user from database using the decoded userId
    const { data: userData, error } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .eq('id', decoded.userId)
      .single();

    console.log('Categories auth middleware - User lookup result:', userData, error);

    if (error || !userData) {
      console.log('Categories auth middleware - User not found');
      return res.status(403).json({ error: 'User not found' });
    }

    req.user = {
      id: userData.id,
      email: userData.email,
      fullName: userData.full_name,
      role: userData.role
    };
    
    console.log('Categories auth middleware - User authenticated:', req.user);
    next();
  } catch (error) {
    console.error('Categories auth middleware - Token verification error:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Middleware to check admin role
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Get all categories (public)
router.get('/', async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      return res.status(500).json({ error: 'Failed to fetch categories' });
    }

    res.json({ categories });
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Request a new category (authenticated users)
router.post('/request', authenticateToken, async (req, res) => {
  try {
    const { name, description, reason } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Check if category already exists
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('name', name.trim())
      .single();

    if (existingCategory) {
      return res.status(400).json({ error: 'Category already exists' });
    }

    // Check if there's already a pending request for this category
    const { data: existingRequest } = await supabase
      .from('category_requests')
      .select('id')
      .eq('name', name.trim())
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return res.status(400).json({ error: 'A request for this category is already pending' });
    }

    // Create the category request
    const { data: request, error } = await supabase
      .from('category_requests')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        reason: reason?.trim() || null,
        requested_by: req.user.id
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating category request:', error);
      return res.status(500).json({ error: 'Failed to create category request' });
    }

    res.status(201).json({ 
      message: 'Category request submitted successfully',
      request 
    });
  } catch (error) {
    console.error('Category request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's category requests (authenticated users)
router.get('/requests/my', authenticateToken, async (req, res) => {
  try {
    const { data: requests, error } = await supabase
      .from('category_requests')
      .select('*')
      .eq('requested_by', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user requests:', error);
      return res.status(500).json({ error: 'Failed to fetch requests' });
    }

    res.json({ requests });
  } catch (error) {
    console.error('User requests fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all category requests (admin only)
router.get('/requests', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = supabase
      .from('category_requests')
      .select(`
        *,
        requested_by_user:users!category_requests_requested_by_fkey(full_name, email),
        reviewed_by_user:users!category_requests_reviewed_by_fkey(full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('Error fetching category requests:', error);
      return res.status(500).json({ error: 'Failed to fetch category requests' });
    }

    res.json({ requests });
  } catch (error) {
    console.error('Category requests fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Approve or reject a category request (admin only)
router.patch('/requests/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, review_notes } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be either approved or rejected' });
    }

    // Get the request details first
    const { data: request, error: fetchError } = await supabase
      .from('category_requests')
      .select(`
        *,
        requested_by_user:users!category_requests_requested_by_fkey(full_name, email)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !request) {
      return res.status(404).json({ error: 'Category request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request has already been reviewed' });
    }

    // Update the request status
    const { data: updatedRequest, error: updateError } = await supabase
      .from('category_requests')
      .update({
        status,
        review_notes: review_notes?.trim() || null,
        reviewed_by: req.user.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating category request:', updateError);
      return res.status(500).json({ error: 'Failed to update category request' });
    }

    // If approved, create the category
    if (status === 'approved') {
      const { error: categoryError } = await supabase
        .from('categories')
        .insert({
          name: request.name,
          description: request.description,
          created_by: request.requested_by
        });

      if (categoryError) {
        console.error('Error creating category:', categoryError);
        // Revert the request status if category creation fails
        await supabase
          .from('category_requests')
          .update({ status: 'pending', reviewed_by: null, reviewed_at: null })
          .eq('id', id);
        
        return res.status(500).json({ error: 'Failed to create category' });
      }
    }

    // Send email notification
    try {
      await sendCategoryRequestStatusEmail(
        request.requested_by_user.email,
        request.requested_by_user.full_name,
        request.name,
        status,
        review_notes
      );
    } catch (emailError) {
      console.error('Error sending notification email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({ 
      message: `Category request ${status} successfully`,
      request: updatedRequest 
    });
  } catch (error) {
    console.error('Category request review error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create category directly (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Check if category already exists
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('name', name.trim())
      .single();

    if (existingCategory) {
      return res.status(400).json({ error: 'Category already exists' });
    }

    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        created_by: req.user.id
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating category:', error);
      return res.status(500).json({ error: 'Failed to create category' });
    }

    res.status(201).json({ 
      message: 'Category created successfully',
      category 
    });
  } catch (error) {
    console.error('Category creation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update category (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Check if another category with the same name exists
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('name', name.trim())
      .neq('id', id)
      .single();

    if (existingCategory) {
      return res.status(400).json({ error: 'A category with this name already exists' });
    }

    const { data: category, error } = await supabase
      .from('categories')
      .update({
        name: name.trim(),
        description: description?.trim() || null
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating category:', error);
      return res.status(500).json({ error: 'Failed to update category' });
    }

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ 
      message: 'Category updated successfully',
      category 
    });
  } catch (error) {
    console.error('Category update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete category (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting category:', error);
      return res.status(500).json({ error: 'Failed to delete category' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Category deletion error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;