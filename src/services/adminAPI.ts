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

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    if (!response.ok) {
      if (!isJson) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      } catch (parseError) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }

    if (isJson) {
      return await response.json();
    } else {
      throw new Error('Response is not JSON');
    }
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to server');
    }
    throw error;
  }
};

export interface AdminStats {
  totalUsers: number;
  totalProducts: number;
  activeListings: number;
  totalOrders: number;
  revenue: number;
  pendingRequests: number;
  totalCategories: number;
}

export interface AdminActivity {
  id: string;
  type: string;
  message: string;
  time: string;
  status: 'success' | 'warning' | 'info' | 'error';
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'user' | 'admin';
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  avatar?: string;
}

export interface AdminCategory {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  users?: {
    full_name: string;
  };
}

export interface AdminCategoryRequest {
  id: string;
  name: string;
  description: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  reviewed_at?: string;
  review_notes?: string;
  users?: {
    full_name: string;
    email: string;
  };
  reviewer?: {
    full_name: string;
  };
}

export interface AdminListing {
  id: string;
  title: string;
  description: string;
  starting_bid: number;
  current_bid: number;
  status: 'draft' | 'active' | 'ended' | 'cancelled';
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
  categories?: {
    name: string;
  };
  users?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface AdminProduct {
  id: string;
  name: string;
  description: string;
  category_id: string;
  seller_id: string;
  status: 'active' | 'inactive' | 'pending' | 'rejected';
  created_at: string;
  updated_at: string;
  categories?: {
    name: string;
  };
  users?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface AdminOrder {
  id: string;
  order_number: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  created_at: string;
  updated_at: string;
  buyer?: {
    id: string;
    full_name: string;
    email: string;
  };
  seller?: {
    id: string;
    full_name: string;
    email: string;
  };
  listing?: {
    title: string;
    description: string;
  };
}

// Dashboard APIs
export const getDashboardStats = async (): Promise<AdminStats> => {
  return await apiCall('/api/admin/dashboard/stats');
};

export const getDashboardActivities = async (): Promise<AdminActivity[]> => {
  return await apiCall('/api/admin/dashboard/activities');
};

// User Management APIs
export const getAllUsers = async (): Promise<AdminUser[]> => {
  return await apiCall('/api/admin/users');
};

export const updateUserRole = async (userId: string, role: 'user' | 'admin'): Promise<void> => {
  await apiCall(`/api/admin/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
};

export const getUserById = async (userId: string): Promise<AdminUser> => {
  return await apiCall(`/api/admin/users/${userId}`);
};

export const updateUser = async (userId: string, userData: { full_name: string; email: string; role: 'user' | 'admin' }): Promise<void> => {
  await apiCall(`/api/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  });
};

export const deleteUser = async (userId: string): Promise<void> => {
  await apiCall(`/api/admin/users/${userId}`, {
    method: 'DELETE',
  });
};

export const changeUserPassword = async (userId: string, newPassword: string): Promise<void> => {
  await apiCall(`/api/admin/users/${userId}/password`, {
    method: 'PUT',
    body: JSON.stringify({ password: newPassword }),
  });
};

// Category Management APIs
export const getAllCategories = async (): Promise<AdminCategory[]> => {
  console.log('adminAPI: getAllCategories called');
  try {
    const result = await apiCall('/api/admin/categories');
    console.log('adminAPI: getAllCategories result:', result);
    return result;
  } catch (error) {
    console.error('adminAPI: getAllCategories error:', error);
    throw error;
  }
};

export const getAllCategoryRequests = async (): Promise<AdminCategoryRequest[]> => {
  console.log('adminAPI: getAllCategoryRequests called');
  try {
    const result = await apiCall('/api/admin/category-requests');
    console.log('adminAPI: getAllCategoryRequests result:', result);
    return result;
  } catch (error) {
    console.error('adminAPI: getAllCategoryRequests error:', error);
    throw error;
  }
};

// Category Management APIs
export const getCategoryById = async (categoryId: string): Promise<AdminCategory> => {
  return await apiCall(`/api/admin/categories/${categoryId}`);
};

export const createCategory = async (categoryData: { name: string; description?: string }): Promise<AdminCategory> => {
  const response = await apiCall('/api/admin/categories', {
    method: 'POST',
    body: JSON.stringify(categoryData),
  });
  console.log('createCategory response:', response);
  return response.category;
};

export const updateCategory = async (categoryId: string, categoryData: { name: string; description?: string }): Promise<void> => {
  await apiCall(`/api/admin/categories/${categoryId}`, {
    method: 'PUT',
    body: JSON.stringify(categoryData),
  });
};

export const deleteCategory = async (categoryId: string): Promise<void> => {
  await apiCall(`/api/admin/categories/${categoryId}`, {
    method: 'DELETE',
  });
};

export const approveCategoryRequest = async (requestId: string, reviewNotes?: string): Promise<void> => {
  await apiCall(`/api/admin/category-requests/${requestId}/approve`, {
    method: 'PUT',
    body: JSON.stringify({ review_notes: reviewNotes }),
  });
};

export const rejectCategoryRequest = async (requestId: string, reviewNotes?: string): Promise<void> => {
  await apiCall(`/api/admin/category-requests/${requestId}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ review_notes: reviewNotes }),
  });
};

// Placeholder APIs for other sections (will be implemented when database tables are created)

// Products APIs
export const getAllProducts = async (): Promise<AdminProduct[]> => {
  return await apiCall('/api/admin/products');
};

export const getProductById = async (productId: string): Promise<AdminProduct> => {
  return await apiCall(`/api/admin/products/${productId}`);
};

export const updateProduct = async (productId: string, productData: Partial<AdminProduct>): Promise<void> => {
  await apiCall(`/api/admin/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(productData),
  });
};

export const deleteProduct = async (productId: string): Promise<void> => {
  await apiCall(`/api/admin/products/${productId}`, {
    method: 'DELETE',
  });
};

// Listings APIs
export const getAllListings = async (): Promise<AdminListing[]> => {
  return await apiCall('/api/admin/listings');
};

export const getListingById = async (listingId: string): Promise<AdminListing> => {
  return await apiCall(`/api/admin/listings/${listingId}`);
};

export const updateListing = async (listingId: string, listingData: { 
  title?: string; 
  description?: string; 
  starting_bid?: number; 
  status?: string;
  start_time?: string;
  end_time?: string;
}): Promise<void> => {
  await apiCall(`/api/admin/listings/${listingId}`, {
    method: 'PUT',
    body: JSON.stringify(listingData),
  });
};

export const deleteListing = async (listingId: string): Promise<void> => {
  await apiCall(`/api/admin/listings/${listingId}`, {
    method: 'DELETE',
  });
};

export const updateListingStatus = async (listingId: string, status: 'draft' | 'active' | 'ended' | 'cancelled'): Promise<void> => {
  await apiCall(`/api/admin/listings/${listingId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
};

// Orders APIs
export const getAllOrders = async (): Promise<AdminOrder[]> => {
  return await apiCall('/api/admin/orders');
};

export const getOrderById = async (orderId: string): Promise<AdminOrder> => {
  return await apiCall(`/api/admin/orders/${orderId}`);
};

export const updateOrder = async (orderId: string, orderData: Partial<AdminOrder>): Promise<void> => {
  await apiCall(`/api/admin/orders/${orderId}`, {
    method: 'PUT',
    body: JSON.stringify(orderData),
  });
};

export const deleteOrder = async (orderId: string): Promise<void> => {
  await apiCall(`/api/admin/orders/${orderId}`, {
    method: 'DELETE',
  });
};

// Bidding History APIs
export const getAllBiddingHistory = async (): Promise<any[]> => {
  return await apiCall('/api/admin/bidding-history');
};

export const getBiddingHistoryById = async (bidId: string): Promise<any> => {
  return await apiCall(`/api/admin/bidding-history/${bidId}`);
};

export const deleteBiddingHistory = async (bidId: string): Promise<void> => {
  await apiCall(`/api/admin/bidding-history/${bidId}`, {
    method: 'DELETE',
  });
};

// Test authentication endpoint
export const testAuth = async (): Promise<any> => {
  return await apiCall('/api/admin/test-auth');
};

// Simple test endpoint
export const testSimple = async (): Promise<any> => {
  return await apiCall('/api/admin/test-simple');
};