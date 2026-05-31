import express from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// Test route to verify router is working
router.get('/test', (req, res) => {
  console.log('Products test route called');
  res.json({ message: 'Products router is working!' });
});

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify JWT token using our JWT_SECRET
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError.message);
      return res.status(403).json({ error: 'Invalid token' });
    }

    // Get user from database using the decoded userId
    const { data: userData, error } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .eq('id', decoded.userId)
      .single();

    if (error || !userData) {
      return res.status(403).json({ error: 'User not found' });
    }

    req.user = {
      id: userData.id,
      email: userData.email,
      fullName: userData.full_name,
      role: userData.role
    };
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Get all products (public - for browsing)
router.get('/', async (req, res) => {
  console.log('Products GET / route called');
  try {
    const { search, category, minBasePrice, maxBasePrice, page = 1, limit = 20, excludeSeller } = req.query;
    console.log('Query params:', { search, category, minBasePrice, maxBasePrice, page, limit, excludeSeller });
    
    let query = supabase
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
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    console.log('Executing Supabase query...');

    // Exclude seller's own products if excludeSeller is provided
    if (excludeSeller) {
      query = query.neq('seller_id', excludeSeller);
      console.log('Excluding products from seller:', excludeSeller);
    }

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    if (category) {
      query = query.eq('category_id', category);
    }
    
    if (minBasePrice) {
      query = query.gte('base_price', parseFloat(minBasePrice));
    }
    
    if (maxBasePrice) {
      query = query.lte('base_price', parseFloat(maxBasePrice));
    }

    // Apply pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: products, error, count } = await query;

    console.log('Supabase query result:', { products, error, count });

    if (error) {
      console.error('Error fetching products:', error);
      return res.status(500).json({ error: 'Failed to fetch products' });
    }

    // Transform response to match frontend interface
    const transformedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      basePrice: parseFloat(product.base_price),
      category: product.category_id || 'Unknown', // Use category_id for now
      image: product.image_url,
      userId: product.seller_id,
      userName: 'Unknown User', // Will be fetched separately if needed
      createdAt: product.created_at,
      updatedAt: product.updated_at
    }));

    console.log('Sending response:', { count: transformedProducts.length });

    res.json({
      products: transformedProducts,
      total: count || 0,
      page: parseInt(page),
      totalPages: Math.ceil((count || 0) / parseInt(limit))
    });
  } catch (error) {
    console.error('Products fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get seller's products (authenticated)
router.get('/seller/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { search, category, page = 1, limit = 20 } = req.query;

    // Users can only view their own products unless they're admin
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    let query = supabase
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
      .eq('seller_id', userId)
      .eq('status', 'active') // Only show active products (exclude sold items)
      .order('created_at', { ascending: false });

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    if (category) {
      query = query.eq('category_id', category);
    }

    // Apply pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: products, error, count } = await query;

    if (error) {
      console.error('Error fetching seller products:', error);
      return res.status(500).json({ error: 'Failed to fetch products' });
    }

    // Transform response to match frontend interface
    const transformedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      basePrice: parseFloat(product.base_price),
      category: product.category_id || 'Unknown',
      image: product.image_url,
      userId: product.seller_id,
      userName: 'Unknown User', // Will be fetched separately if needed
      createdAt: product.created_at,
      updatedAt: product.updated_at
    }));

    res.json({
      products: transformedProducts,
      total: count || 0,
      page: parseInt(page),
      totalPages: Math.ceil((count || 0) / parseInt(limit))
    });
  } catch (error) {
    console.error('Seller products fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
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

    // Transform response to match frontend interface
    const transformedProduct = {
      id: product.id,
      name: product.name,
      description: product.description,
      basePrice: parseFloat(product.base_price),
      category: product.category_id || 'Unknown',
      image: product.image_url,
      userId: product.seller_id,
      userName: 'Unknown User', // Will be fetched separately if needed
      createdAt: product.created_at,
      updatedAt: product.updated_at
    };

    res.json(transformedProduct);
  } catch (error) {
    console.error('Product fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new product (authenticated)
router.post('/', authenticateToken, async (req, res) => {
  console.log('Products POST / route called');
  console.log('Request body:', req.body);
  console.log('User:', req.user);
  
  try {
    const { name, description, basePrice, category, image, userId, userName } = req.body;

    // Validate required fields
    if (!name || !basePrice || !category) {
      console.log('Validation failed: missing required fields');
      return res.status(400).json({ error: 'Name, base price, and category are required' });
    }

    // Validate base price
    const price = parseFloat(basePrice);
    if (isNaN(price) || price <= 0) {
      console.log('Validation failed: invalid base price');
      return res.status(400).json({ error: 'Base price must be a positive number' });
    }

    // Prevent admin users from creating products (they should only manage, not sell)
    if (req.user.role === 'admin') {
      console.log('Authorization failed: admin users cannot create products');
      return res.status(403).json({ error: 'Admin users cannot create or sell products' });
    }

    // Users can only create products for themselves
    if (req.user.id !== userId) {
      console.log('Authorization failed: user cannot create product for another user');
      return res.status(403).json({ error: 'Access denied' });
    }

    console.log('Creating product in database...');

    // Create product in database
    const { data: product, error } = await supabase
      .from('products')
      .insert([{
        name: name.trim(),
        description: description?.trim() || null,
        base_price: price,
        category_id: category.trim(), // This should be a UUID
        image_url: image || null, // Store base64 data URL directly
        seller_id: userId,
        status: 'active'
      }])
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

    console.log('Supabase insert result:', { product, error });

    if (error) {
      console.error('Error creating product:', error);
      return res.status(500).json({ error: 'Failed to create product' });
    }

    // Transform response to match frontend interface
    const transformedProduct = {
      id: product.id,
      name: product.name,
      description: product.description,
      basePrice: parseFloat(product.base_price),
      category: product.category_id || 'Unknown',
      image: product.image_url,
      userId: product.seller_id,
      userName: userName || req.user.fullName,
      createdAt: product.created_at,
      updatedAt: product.updated_at
    };

    console.log('Sending response:', transformedProduct);

    res.status(201).json(transformedProduct);
  } catch (error) {
    console.error('Product creation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update product (authenticated)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, basePrice, category, image } = req.body;

    // Get existing product to check ownership
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('seller_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Users can only update their own products unless they're admin (for management purposes)
    if (req.user.id !== existingProduct.seller_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

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
    if (image !== undefined) updateData.image_url = image || null;

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

    // Transform response to match frontend interface
    const transformedProduct = {
      id: product.id,
      name: product.name,
      description: product.description,
      basePrice: parseFloat(product.base_price),
      category: product.category_id || 'Unknown',
      image: product.image_url,
      userId: product.seller_id,
      userName: 'Unknown User', // Will be fetched separately if needed
      createdAt: product.created_at,
      updatedAt: product.updated_at
    };

    res.json(transformedProduct);
  } catch (error) {
    console.error('Product update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete product (authenticated)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get existing product to check ownership
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('seller_id, name')
      .eq('id', id)
      .single();

    if (fetchError || !existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Users can only delete their own products unless they're admin
    if (req.user.id !== existingProduct.seller_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
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
      deletedProduct: { id, name: existingProduct.name }
    });
  } catch (error) {
    console.error('Product deletion error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;