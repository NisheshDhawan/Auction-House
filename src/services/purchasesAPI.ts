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

// Purchase Interfaces
export interface Purchase {
  id: string;
  userId: string;
  listingId: string;
  productId: string;
  productName: string;
  productImage?: string;
  category: string;
  finalPrice: number;
  purchaseDate: string;
  sellerName?: string;
  auctionEndDate: string;
  isPaid?: boolean; // Track payment status
  paymentId?: string; // Track payment ID
}

export interface PurchasesResponse {
  purchases: Purchase[];
  total: number;
}

// Local storage keys
const PURCHASES_STORAGE_KEY = 'auction_house_purchases';

// Helper functions for local storage
const getStoredPurchases = (): Purchase[] => {
  try {
    const stored = localStorage.getItem(PURCHASES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const setStoredPurchases = (purchases: Purchase[]): void => {
  try {
    localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify(purchases));
  } catch (error) {
    console.error('Failed to save purchases to localStorage:', error);
  }
};

// Purchases API functions
export const purchasesAPI = {
  // Get user's purchases
  getUserPurchases: async (userId: string): Promise<PurchasesResponse> => {
    try {
      console.log('🔍 Fetching purchases for user:', userId);
      const response = await apiCall(`/api/purchases/user/${userId}`);
      console.log('✅ Purchases API response:', response);
      return response;
    } catch (error) {
      console.warn('❌ Purchases API error:', error);
      console.warn('Using stored data as fallback');
      
      const allPurchases = getStoredPurchases();
      const userPurchases = allPurchases.filter(p => p.userId === userId);
      
      return {
        purchases: userPurchases,
        total: userPurchases.length
      };
    }
  },

  // Get seller's purchases (items sold by this seller)
  getSellerPurchases: async (sellerId: string): Promise<PurchasesResponse> => {
    try {
      console.log('🔍 Fetching seller purchases for:', sellerId);
      const response = await apiCall(`/api/purchases/seller/${sellerId}`);
      console.log('✅ Seller purchases API response:', response);
      return response;
    } catch (error) {
      console.warn('❌ Seller purchases API error:', error);
      console.warn('Using empty data as fallback');
      
      return {
        purchases: [],
        total: 0
      };
    }
  },

  // Add a new purchase (when auction ends)
  addPurchase: async (purchase: Omit<Purchase, 'id' | 'purchaseDate'>): Promise<Purchase> => {
    try {
      return await apiCall('/api/purchases', {
        method: 'POST',
        body: JSON.stringify(purchase),
      });
    } catch (error) {
      console.warn('Backend not available, storing purchase locally');
      
      const newPurchase: Purchase = {
        ...purchase,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        purchaseDate: new Date().toISOString()
      };
      
      const purchases = getStoredPurchases();
      purchases.push(newPurchase);
      setStoredPurchases(purchases);
      
      return newPurchase;
    }
  }
};