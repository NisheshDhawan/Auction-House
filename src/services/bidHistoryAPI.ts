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

// Bid History Interfaces
export interface BidHistory {
  id: string;
  userId?: string;
  userName?: string;
  bidderId?: string;
  bidderName?: string;
  bidderEmail?: string;
  listingId: string;
  productId: string;
  productName: string;
  productImage?: string;
  bidAmount: number;
  bidDate: string;
  auctionStatus?: 'active' | 'won' | 'lost' | 'ongoing';
  status?: string;
  auctionEndDate: string;
  finalPrice?: number;
  isWinningBid: boolean;
}

export interface BidHistoryResponse {
  bids: BidHistory[];
  total: number;
}

// Bid History API functions
export const bidHistoryAPI = {
  // Get all bids (admin only)
  getAllBids: async (): Promise<BidHistoryResponse> => {
    try {
      return await apiCall('/api/bids/admin/all');
    } catch (error) {
      console.warn('Backend not available, returning empty data');
      return {
        bids: [],
        total: 0
      };
    }
  },

  getUserBidHistory: async (userId: string): Promise<BidHistoryResponse> => {
    try {
      const response = await apiCall(`/api/bids/user/${userId}`);
      return response;
    } catch (error) {
      console.warn('Failed to fetch bid history:', error);
      return { bids: [], total: 0 };
    }
  },

  placeBid: async (listingId: string, bidAmount: number): Promise<any> => {
    return await apiCall('/api/bids', {
      method: 'POST',
      body: JSON.stringify({ listingId, bidAmount }),
    });
  },

  addBidToHistory: async (bid: Omit<BidHistory, 'id' | 'bidDate'>): Promise<BidHistory> => {
    return await apiCall('/api/bids', {
      method: 'POST',
      body: JSON.stringify({
        listingId: bid.listingId,
        bidAmount: bid.bidAmount
      }),
    });
  },

  updateBidStatus: async (listingId: string, finalPrice: number, winnerId: string): Promise<void> => {
    try {
      await apiCall(`/api/bids/listing/${listingId}/complete`, {
        method: 'PUT',
        body: JSON.stringify({ finalPrice, winnerId }),
      });
    } catch (error) {
      console.warn('Failed to update bid status:', error);
    }
  }
};