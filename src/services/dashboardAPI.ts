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

// Dashboard Stats Interface
export interface DashboardStats {
  title: string;
  value: string | number;
  change: string;
  icon: string;
}

export interface RecentActivity {
  id: string;
  message: string;
  timestamp: string;
  type: 'order' | 'product' | 'customer' | 'payment';
}

export interface Product {
  id: string;
  name: string;
  basePrice: number;
  image?: string;
  rating?: number;
  soldCount?: number;
}

// Dashboard API functions
export const dashboardAPI = {
  getBuyerStats: async (): Promise<DashboardStats[]> => {
    try {
      return await apiCall('/api/dashboard/buyer/stats');
    } catch (error) {
      console.warn('Failed to fetch buyer stats:', error);
      return [];
    }
  },

  getSellerStats: async (): Promise<DashboardStats[]> => {
    try {
      return await apiCall('/api/dashboard/seller/stats');
    } catch (error) {
      console.warn('Failed to fetch seller stats:', error);
      return [];
    }
  },

  getRecentActivity: async (profileType: 'buyer' | 'seller'): Promise<RecentActivity[]> => {
    try {
      return await apiCall(`/api/dashboard/${profileType}/activity`);
    } catch (error) {
      console.warn('Failed to fetch recent activity:', error);
      return [];
    }
  },

  getRecommendedProducts: async (): Promise<Product[]> => {
    try {
      return await apiCall('/api/dashboard/buyer/recommended');
    } catch (error) {
      console.warn('Failed to fetch recommended products:', error);
      return [];
    }
  },

  getTopProducts: async (): Promise<Product[]> => {
    try {
      return await apiCall('/api/dashboard/seller/top-products');
    } catch (error) {
      console.warn('Failed to fetch top products:', error);
      return [];
    }
  },
};