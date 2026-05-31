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

// Category Request Interfaces
export interface CategoryRequest {
  id: string;
  name: string;
  description?: string;
  color?: string;
  requestedBy: string;
  requestedByName: string;
  requestedByEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryRequestFormData {
  name: string;
  description?: string;
  reason?: string;
  color?: string;
  requestedBy: string;
  requestedByName: string;
  requestedByEmail: string;
}

export interface CategoryRequestFilters {
  status?: 'pending' | 'approved' | 'rejected';
  search?: string;
  page?: number;
  limit?: number;
}

export interface CategoryRequestsResponse {
  requests: CategoryRequest[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ReviewCategoryRequestData {
  status: 'approved' | 'rejected';
  adminNotes?: string;
  reviewedBy: string;
  reviewedByName: string;
}

// Category Requests API functions
export const categoryRequestsAPI = {
  // Submit new category request
  submitCategoryRequest: async (requestData: CategoryRequestFormData): Promise<CategoryRequest> => {
    const response = await apiCall('/api/categories/request', {
      method: 'POST',
      body: JSON.stringify({
        name: requestData.name,
        description: requestData.description,
        reason: requestData.reason || `Requested by ${requestData.requestedByName}`
      }),
    });
    
    // Transform backend response to match frontend interface
    return {
      id: response.request.id,
      name: response.request.name,
      description: response.request.description,
      color: requestData.color || '#3B82F6',
      requestedBy: response.request.requested_by,
      requestedByName: requestData.requestedByName,
      requestedByEmail: requestData.requestedByEmail,
      status: response.request.status,
      adminNotes: response.request.review_notes,
      reviewedBy: response.request.reviewed_by,
      reviewedByName: '',
      reviewedAt: response.request.reviewed_at,
      createdAt: response.request.created_at,
      updatedAt: response.request.updated_at
    };
  },

  // Get user's category requests
  getUserCategoryRequests: async (): Promise<CategoryRequestsResponse> => {
    const response = await apiCall('/api/categories/requests/my');
    
    // Transform backend response to match frontend interface
    const transformedRequests = response.requests.map((req: any) => ({
      id: req.id,
      name: req.name,
      description: req.description,
      color: '#3B82F6', // Default color since backend doesn't store it
      requestedBy: req.requested_by,
      requestedByName: 'You',
      requestedByEmail: '',
      status: req.status,
      adminNotes: req.review_notes,
      reviewedBy: req.reviewed_by,
      reviewedByName: '',
      reviewedAt: req.reviewed_at,
      createdAt: req.created_at,
      updatedAt: req.updated_at
    }));
    
    return {
      requests: transformedRequests,
      total: transformedRequests.length,
      page: 1,
      totalPages: 1
    };
  },

  // Get all category requests (admin only)
  getAllCategoryRequests: async (filters?: CategoryRequestFilters): Promise<CategoryRequestsResponse> => {
    const queryParams = new URLSearchParams();
    if (filters?.status) {
      queryParams.append('status', filters.status);
    }
    const queryString = queryParams.toString();
    
    const response = await apiCall(`/api/admin/category-requests${queryString ? `?${queryString}` : ''}`);
    
    // Transform backend response to match frontend interface
    const transformedRequests = response.map((req: any) => ({
      id: req.id,
      name: req.name,
      description: req.description,
      color: '#3B82F6', // Default color since backend doesn't store it
      requestedBy: req.requested_by,
      requestedByName: req.users?.full_name || 'Unknown User',
      requestedByEmail: req.users?.email || '',
      status: req.status,
      adminNotes: req.review_notes,
      reviewedBy: req.reviewed_by,
      reviewedByName: req.reviewer?.full_name || '',
      reviewedAt: req.reviewed_at,
      createdAt: req.created_at,
      updatedAt: req.updated_at
    }));
    
    return {
      requests: transformedRequests,
      total: transformedRequests.length,
      page: 1,
      totalPages: 1
    };
  },

  // Review category request (admin only)
  reviewCategoryRequest: async (requestId: string, reviewData: ReviewCategoryRequestData): Promise<CategoryRequest> => {
    const endpoint = reviewData.status === 'approved' 
      ? `/api/admin/category-requests/${requestId}/approve`
      : `/api/admin/category-requests/${requestId}/reject`;
    
    const response = await apiCall(endpoint, {
      method: 'PUT',
      body: JSON.stringify({
        review_notes: reviewData.adminNotes
      }),
    });
    
    // For successful review, we need to return the updated request data
    // Since the admin endpoints don't return the full request data, we'll construct it
    return {
      id: requestId,
      name: response.category?.name || 'Category',
      description: response.category?.description || '',
      color: '#3B82F6', // Default color since backend doesn't store it
      requestedBy: 'unknown',
      requestedByName: 'User',
      requestedByEmail: '',
      status: reviewData.status,
      adminNotes: reviewData.adminNotes,
      reviewedBy: reviewData.reviewedBy,
      reviewedByName: reviewData.reviewedByName,
      reviewedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  // Delete category request
  deleteCategoryRequest: async (requestId: string): Promise<void> => {
    return await apiCall(`/api/category-requests/${requestId}`, {
      method: 'DELETE',
    });
  },
};