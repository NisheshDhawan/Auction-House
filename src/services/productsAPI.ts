const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Helper function for API calls
const apiCall = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  try {
    const token = localStorage.getItem('auth_token');
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    if (!response.ok) {
      // If it's not JSON (like HTML error page), throw a generic error
      if (!isJson) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Try to parse JSON error
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      } catch (parseError) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }

    // Parse successful JSON response
    if (isJson) {
      return await response.json();
    } else {
      throw new Error('Response is not JSON');
    }
  } catch (error) {
    // Re-throw with more context for network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to server');
    }
    throw error;
  }
};

// Product Interfaces
export interface Product {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  category: string;
  image?: string;
  userId: string;
  userName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  productCount: number;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  minBasePrice?: number;
  maxBasePrice?: number;
  page?: number;
  limit?: number;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
}

// Local storage keys
const PRODUCTS_STORAGE_KEY = 'auction_house_products';
const CATEGORIES_STORAGE_KEY = 'auction_house_categories';

// Helper functions for local storage
const getStoredProducts = (): Product[] => {
  try {
    const stored = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const setStoredProducts = (products: Product[]): void => {
  try {
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
  } catch (error) {
    console.error('Failed to save products to localStorage:', error);
  }
};

const getStoredCategories = (): Category[] => {
  try {
    const stored = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const setStoredCategories = (categories: Category[]): void => {
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  } catch (error) {
    console.error('Failed to save categories to localStorage:', error);
  }
};

// Helper function to update category product counts
const updateCategoryProductCounts = (): void => {
  try {
    const products = getStoredProducts();
    const categories = getStoredCategories();
    
    const updatedCategories = categories.map(category => ({
      ...category,
      productCount: products.filter(p => p.category === category.name).length
    }));
    
    setStoredCategories(updatedCategories);
  } catch (error) {
    console.error('Failed to update category product counts:', error);
  }
};

// Products API functions
export const productsAPI = {
  // Get all products (for browsing)
  getProducts: async (filters?: ProductFilters): Promise<ProductsResponse> => {
    try {
      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }
      const queryString = queryParams.toString();
      const response = await apiCall(`/api/products${queryString ? `?${queryString}` : ''}`);
      
      // Fetch categories to map category IDs to names
      const categories = await productsAPI.getCategories();
      const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));
      
      // Transform products to include category names
      const transformedProducts = response.products.map((product: any) => ({
        ...product,
        category: categoryMap.get(product.category) || product.category
      }));
      
      return {
        ...response,
        products: transformedProducts
      };
    } catch (error) {
      console.warn('Backend not available, using stored data for products');
      
      // Get stored products
      let filteredProducts = getStoredProducts();
      
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredProducts = filteredProducts.filter(p => 
          p.name.toLowerCase().includes(searchTerm) || 
          p.description?.toLowerCase().includes(searchTerm)
        );
      }
      
      return {
        products: filteredProducts,
        total: filteredProducts.length,
        page: 1,
        totalPages: 1
      };
    }
  },

  // Get products for buyers (excluding seller's own products)
  getBuyerProducts: async (buyerId: string, filters?: ProductFilters): Promise<ProductsResponse> => {
    try {
      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }
      // Add excludeSeller parameter to filter out buyer's own products
      queryParams.append('excludeSeller', buyerId);
      
      const queryString = queryParams.toString();
      const response = await apiCall(`/api/products${queryString ? `?${queryString}` : ''}`);
      
      // Fetch categories to map category IDs to names
      const categories = await productsAPI.getCategories();
      const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));
      
      // Transform products to include category names
      const transformedProducts = response.products.map((product: any) => ({
        ...product,
        category: categoryMap.get(product.category) || product.category
      }));
      
      return {
        ...response,
        products: transformedProducts
      };
    } catch (error) {
      console.warn('Backend not available, using stored data for buyer products');
      
      // Get stored products and exclude buyer's own products
      let filteredProducts = getStoredProducts().filter(p => p.userId !== buyerId);
      
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredProducts = filteredProducts.filter(p => 
          p.name.toLowerCase().includes(searchTerm) || 
          p.description?.toLowerCase().includes(searchTerm)
        );
      }
      
      if (filters?.category) {
        filteredProducts = filteredProducts.filter(p => p.category === filters.category);
      }
      
      if (filters?.minBasePrice !== undefined) {
        filteredProducts = filteredProducts.filter(p => p.basePrice >= filters.minBasePrice!);
      }
      
      if (filters?.maxBasePrice !== undefined) {
        filteredProducts = filteredProducts.filter(p => p.basePrice <= filters.maxBasePrice!);
      }
      
      return {
        products: filteredProducts,
        total: filteredProducts.length,
        page: 1,
        totalPages: 1
      };
    }
  },

  // Get seller's products (user-specific)
  getSellerProducts: async (userId: string, filters?: ProductFilters): Promise<ProductsResponse> => {
    try {
      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }
      const queryString = queryParams.toString();
      return await apiCall(`/api/products/seller/${userId}${queryString ? `?${queryString}` : ''}`);
    } catch (error) {
      console.warn('Backend not available, using stored data for seller products');
      
      // Get stored products and filter by user ID
      let filteredProducts = getStoredProducts().filter(p => p.userId === userId);
      
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredProducts = filteredProducts.filter(p => 
          p.name.toLowerCase().includes(searchTerm) || 
          p.description?.toLowerCase().includes(searchTerm)
        );
      }
      
      if (filters?.category) {
        filteredProducts = filteredProducts.filter(p => p.category === filters.category);
      }
      
      if (filters?.minBasePrice !== undefined) {
        filteredProducts = filteredProducts.filter(p => p.basePrice >= filters.minBasePrice!);
      }
      
      if (filters?.maxBasePrice !== undefined) {
        filteredProducts = filteredProducts.filter(p => p.basePrice <= filters.maxBasePrice!);
      }
      
      return {
        products: filteredProducts,
        total: filteredProducts.length,
        page: 1,
        totalPages: 1
      };
    }
  },

  // Get single product
  getProduct: async (id: string): Promise<Product> => {
    try {
      return await apiCall(`/api/products/${id}`);
    } catch (error) {
      console.warn('Backend not available, using stored data for single product');
      const products = getStoredProducts();
      const product = products.find(p => p.id === id);
      if (!product) {
        throw new Error('Product not found');
      }
      return product;
    }
  },

  // Create new product
  createProduct: async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> => {
    try {
      return await apiCall('/api/products', {
        method: 'POST',
        body: JSON.stringify(productData),
      });
    } catch (error) {
      console.warn('Backend not available, storing product locally');
      const newProduct: Product = {
        ...productData,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Save to localStorage
      const products = getStoredProducts();
      products.push(newProduct);
      setStoredProducts(products);
      
      // Update category product counts
      updateCategoryProductCounts();
      
      return newProduct;
    }
  },

  // Update product
  updateProduct: async (id: string, productData: Partial<Product>): Promise<Product> => {
    try {
      return await apiCall(`/api/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(productData),
      });
    } catch (error) {
      console.warn('Backend not available, updating product locally');
      const products = getStoredProducts();
      const productIndex = products.findIndex(p => p.id === id);
      
      if (productIndex === -1) {
        throw new Error('Product not found');
      }
      
      const updatedProduct = {
        ...products[productIndex],
        ...productData,
        updatedAt: new Date().toISOString()
      };
      
      products[productIndex] = updatedProduct;
      setStoredProducts(products);
      
      // Update category product counts
      updateCategoryProductCounts();
      
      return updatedProduct;
    }
  },

  // Delete product
  deleteProduct: async (id: string): Promise<void> => {
    try {
      return await apiCall(`/api/products/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.warn('Backend not available, deleting product locally');
      const products = getStoredProducts();
      const filteredProducts = products.filter(p => p.id !== id);
      setStoredProducts(filteredProducts);
      
      // Update category product counts
      updateCategoryProductCounts();
      
      return Promise.resolve();
    }
  },

  // Get all categories
  getCategories: async (): Promise<Category[]> => {
    try {
      const response = await apiCall('/api/categories');
      
      // Transform backend response to match frontend interface
      return response.categories.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        productCount: 0, // Will be calculated on frontend
        color: '#3B82F6', // Default color
        createdAt: cat.created_at,
        updatedAt: cat.updated_at
      }));
    } catch (error) {
      console.warn('Backend not available, using stored data for categories');
      return getStoredCategories();
    }
  },

  // Create new category (admin only)
  createCategory: async (categoryData: Omit<Category, 'id' | 'productCount' | 'createdAt' | 'updatedAt'>): Promise<Category> => {
    try {
      const response = await apiCall('/api/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: categoryData.name,
          description: categoryData.description
        }),
      });
      
      // Transform backend response to match frontend interface
      return {
        id: response.category.id,
        name: response.category.name,
        description: response.category.description,
        productCount: 0,
        color: categoryData.color || '#3B82F6',
        createdAt: response.category.created_at,
        updatedAt: response.category.updated_at
      };
    } catch (error) {
      console.warn('Backend not available, storing category locally');
      const newCategory: Category = {
        ...categoryData,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        productCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Save to localStorage
      const categories = getStoredCategories();
      categories.push(newCategory);
      setStoredCategories(categories);
      
      return newCategory;
    }
  },

  // Update category (admin only)
  // Note: Category editing and deletion is restricted to admins only
  // These functions are disabled for regular users
  
  updateCategory: async (id: string, categoryData: Partial<Category>): Promise<Category> => {
    throw new Error('Category editing is restricted to administrators only. Please contact an admin to modify categories.');
  },

  deleteCategory: async (id: string): Promise<void> => {
    throw new Error('Category deletion is restricted to administrators only. Please contact an admin to remove categories.');
  },
};