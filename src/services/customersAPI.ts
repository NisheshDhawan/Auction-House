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

// Customer Interfaces
export interface Customer {
  id: string;
  sellerId: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  firstPurchaseDate: string;
  lastPurchaseDate: string;
  totalOrders: number;
  totalSpent: number;
  favoriteCategory?: string;
}

export interface CustomersResponse {
  customers: Customer[];
  total: number;
}

// Customers API functions
export const customersAPI = {
  // Clear any cached customer data from local storage
  clearLocalStorage: (): void => {
    try {
      localStorage.removeItem('auction_house_customers');
      console.log('Cleared customer data from local storage');
    } catch (error) {
      console.error('Failed to clear customer data from localStorage:', error);
    }
  },

  // Get seller's customers
  getSellerCustomers: async (sellerId: string): Promise<CustomersResponse> => {
    try {
      console.log('Attempting to fetch customers from API for seller:', sellerId);
      const response = await apiCall(`/api/customers/seller/${sellerId}`);
      console.log('Successfully fetched customers from API:', response);
      
      // Always return API data, never fallback to local storage for real-time accuracy
      return response;
    } catch (error) {
      console.error('Backend API error for customers:', error);
      
      // For real-time database connectivity, we should NOT show cached data
      // Instead, return empty results and let the user know database is needed
      console.log('No database connection - returning empty customer list');
      
      return {
        customers: [],
        total: 0
      };
    }
  },

  // Add or update customer (when they make a purchase)
  addOrUpdateCustomer: async (customerData: {
    sellerId: string;
    customerId: string;
    customerName: string;
    customerEmail?: string;
    orderAmount: number;
    category: string;
  }): Promise<Customer> => {
    try {
      return await apiCall('/api/customers', {
        method: 'POST',
        body: JSON.stringify(customerData),
      });
    } catch (error) {
      console.error('Backend not available for adding customer:', error);
      throw new Error('Database connection required to add customers');
    }
  },

  // Manual function to populate correct customer data based on auction completions
  populateRealCustomerData: async (sellerId: string): Promise<void> => {
    console.log('This function is deprecated - customer data should come from database only');
    throw new Error('Use database-only customer data. No local storage fallback.');
  },

  // Get seller's customer statistics
  getCustomerStats: async (sellerId: string): Promise<{
    totalCustomers: number;
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
  }> => {
    try {
      return await apiCall(`/api/customers/seller/${sellerId}/stats`);
    } catch (error) {
      console.error('Backend not available for customer stats:', error);
      return {
        totalCustomers: 0,
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0
      };
    }
  },
  getCustomerProducts: async (sellerId: string, customerId: string): Promise<{
    products: Array<{
      id: string;
      name: string;
      image: string;
      category: string;
      purchasePrice: number;
      purchaseDate: string;
      auctionId: string;
      paymentId?: string;
    }>;
  }> => {
    try {
      return await apiCall(`/api/customers/seller/${sellerId}/customer/${customerId}/products`);
    } catch (error) {
      console.error('Backend not available for customer products:', error);
      
      // Return empty products - no local storage fallback for real-time data
      return { products: [] };
    }
  }
};