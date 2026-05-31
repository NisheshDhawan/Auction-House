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

// Listing Interfaces
export interface Listing {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  basePrice: number;
  currentBid: number;
  bidIncrement: number;
  highestBidderId?: string;
  highestBidderName?: string;
  winnerName?: string;
  sellerId: string;
  sellerName?: string;
  startDateTime: string;
  endDateTime: string;
  status: 'unlisted' | 'listed' | 'active' | 'sold' | 'unsold';
  totalBids: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListingFormData {
  productId: string;
  startDateTime: string;
  endDateTime: string;
  sellerId?: string;
  sellerName?: string;
}

export interface ListingFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ListingsResponse {
  listings: Listing[];
  total: number;
  page: number;
  totalPages: number;
}

// Local storage keys
const LISTINGS_STORAGE_KEY = 'auction_house_listings';

// Helper functions for local storage
const getStoredListings = (): Listing[] => {
  try {
    const stored = localStorage.getItem(LISTINGS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const setStoredListings = (listings: Listing[]): void => {
  try {
    localStorage.setItem(LISTINGS_STORAGE_KEY, JSON.stringify(listings));
  } catch (error) {
    console.error('Failed to save listings to localStorage:', error);
  }
};

// Listings API functions
export const listingsAPI = {
  // Get available products for listing (not currently listed)
  getAvailableProducts: async (sellerId: string): Promise<{ availableProducts: any[], totalProducts: number, listedProducts: number }> => {
    try {
      return await apiCall(`/api/listings/available-products-for/${sellerId}`);
    } catch (error) {
      console.warn('Backend not available, using stored data for available products');
      
      // Get all products and listings from localStorage
      const products = JSON.parse(localStorage.getItem('auction_house_products') || '[]');
      const listings = getStoredListings();
      
      // Filter products by seller
      const sellerProducts = products.filter((p: any) => p.userId === sellerId);
      
      // Get active/pending listing titles
      const activeListingTitles = new Set(
        listings
          .filter(l => ['listed', 'active'].includes(l.status))
          .map(l => l.productName)
      );
      
      // Filter out already listed products
      const availableProducts = sellerProducts.filter((p: any) => !activeListingTitles.has(p.name));
      
      return {
        availableProducts,
        totalProducts: sellerProducts.length,
        listedProducts: sellerProducts.length - availableProducts.length
      };
    }
  },

  // Get all listings
  getListings: async (filters?: ListingFilters): Promise<ListingsResponse> => {
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
      return await apiCall(`/api/listings${queryString ? `?${queryString}` : ''}`);
    } catch (error) {
      console.warn('Backend not available, using stored data for listings');
      
      let filteredListings = getStoredListings();
      
      if (filters?.status) {
        filteredListings = filteredListings.filter(l => l.status === filters.status);
      }
      
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredListings = filteredListings.filter(l => 
          l.productName.toLowerCase().includes(searchTerm)
        );
      }
      
      return {
        listings: filteredListings,
        total: filteredListings.length,
        page: 1,
        totalPages: 1
      };
    }
  },

  // Get seller's listings (user-specific)
  getSellerListings: async (sellerId: string, filters?: ListingFilters): Promise<ListingsResponse> => {
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
      return await apiCall(`/api/listings/seller/${sellerId}${queryString ? `?${queryString}` : ''}`);
    } catch (error) {
      console.warn('Backend not available, using stored data for seller listings');
      
      // Get all listings and filter by seller
      let filteredListings = getStoredListings();
      
      // Filter by seller - we need to match listings to products owned by the seller
      const products = JSON.parse(localStorage.getItem('auction_house_products') || '[]');
      const sellerProductIds = products
        .filter((p: any) => p.userId === sellerId)
        .map((p: any) => p.id);
      
      filteredListings = filteredListings.filter(l => sellerProductIds.includes(l.productId));
      
      if (filters?.status) {
        filteredListings = filteredListings.filter(l => l.status === filters.status);
      }
      
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredListings = filteredListings.filter(l => 
          l.productName.toLowerCase().includes(searchTerm)
        );
      }
      
      return {
        listings: filteredListings,
        total: filteredListings.length,
        page: 1,
        totalPages: 1
      };
    }
  },

  // Create new listing
  createListing: async (listingData: ListingFormData): Promise<Listing> => {
    try {
      // Validate required fields on client side
      if (!listingData.productId) {
        throw new Error('Product ID is required');
      }
      if (!listingData.startDateTime) {
        throw new Error('Start date and time is required');
      }
      if (!listingData.endDateTime) {
        throw new Error('End date and time is required');
      }
      if (!listingData.sellerId) {
        throw new Error('User authentication required. Please log in again.');
      }
      
      // Use the apiCall helper function which includes authentication
      return await apiCall('/api/listings', {
        method: 'POST',
        body: JSON.stringify(listingData),
      });
    } catch (error) {
      console.warn('Backend not available, storing listing locally');
      
      // Get product details from stored products
      const products = JSON.parse(localStorage.getItem('auction_house_products') || '[]');
      const product = products.find((p: any) => p.id === listingData.productId);
      
      if (!product) {
        throw new Error('Product not found');
      }

      const newListing: Listing = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        productId: listingData.productId,
        productName: product.name,
        productImage: product.image,
        basePrice: product.basePrice,
        currentBid: product.basePrice,
        sellerId: listingData.sellerId || product.userId || '',
        sellerName: listingData.sellerName || product.userName || 'Unknown Seller',
        startDateTime: listingData.startDateTime,
        endDateTime: listingData.endDateTime,
        status: 'listed',
        totalBids: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Save to localStorage
      const listings = getStoredListings();
      listings.push(newListing);
      setStoredListings(listings);
      
      return newListing;
    }
  },

  // Update listing status
  updateListingStatus: async (id: string, status: Listing['status'], winnerInfo?: { winnerName?: string }): Promise<Listing> => {
    try {
      return await apiCall(`/api/listings/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, ...winnerInfo }),
      });
    } catch (error) {
      console.warn('Backend not available, updating listing locally');
      const listings = getStoredListings();
      const listingIndex = listings.findIndex(l => l.id === id);
      
      if (listingIndex === -1) {
        throw new Error('Listing not found');
      }
      
      const listing = listings[listingIndex];
      const updatedListing = {
        ...listing,
        status,
        // Set winner name if status is sold and there's a highest bidder
        winnerName: status === 'sold' && listing.highestBidderName 
          ? listing.highestBidderName 
          : winnerInfo?.winnerName,
        updatedAt: new Date().toISOString()
      };
      
      listings[listingIndex] = updatedListing;
      setStoredListings(listings);
      
      return updatedListing;
    }
  },

  // Delete listing
  deleteListing: async (id: string): Promise<void> => {
    try {
      return await apiCall(`/api/listings/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.warn('Backend not available, deleting listing locally');
      const listings = getStoredListings();
      const filteredListings = listings.filter(l => l.id !== id);
      setStoredListings(filteredListings);
      return Promise.resolve();
    }
  },

  // Get single listing
  getListing: async (id: string): Promise<Listing> => {
    try {
      return await apiCall(`/api/listings/${id}`);
    } catch (error) {
      console.warn('Backend not available, using stored data for single listing');
      const listings = getStoredListings();
      const listing = listings.find(l => l.id === id);
      if (!listing) {
        throw new Error('Listing not found');
      }
      return listing;
    }
  },

  // Simulate bid activity (for demo purposes)
  simulateBid: async (id: string, bidAmount: number, bidderId?: string, bidderName?: string): Promise<Listing> => {
    try {
      const response = await apiCall(`/api/listings/${id}/bid`, {
        method: 'POST',
        body: JSON.stringify({ bidAmount, bidderId, bidderName }),
      });
      
      // Return the updated listing from the response
      if (response.bid && response.newCurrentBid) {
        // If the response contains bid info, we need to fetch the updated listing
        const updatedListing = await listingsAPI.getListing(id);
        return updatedListing;
      }
      
      return response;
    } catch (error: any) {
      // Handle consecutive bid error specifically
      if (error.message.includes('CONSECUTIVE_BID_NOT_ALLOWED') || 
          error.message.includes('already the highest bidder')) {
        throw new Error('You are already the highest bidder. Wait for another user to bid before placing a new bid.');
      }
      
      console.warn('Backend not available, simulating bid locally');
      const listings = getStoredListings();
      const listingIndex = listings.findIndex(l => l.id === id);
      
      if (listingIndex === -1) {
        throw new Error('Listing not found');
      }
      
      const listing = listings[listingIndex];
      if (bidAmount <= listing.currentBid) {
        throw new Error('Bid must be higher than current bid');
      }

      // Get current user info from localStorage
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const finalBidderId = bidderId || currentUser.id || 'anonymous';
      const finalBidderName = bidderName || currentUser.fullName || 'Anonymous Bidder';
      
      const updatedListing = {
        ...listing,
        currentBid: bidAmount,
        bidIncrement: listing.bidIncrement || 500, // Ensure bidIncrement is included
        highestBidderId: finalBidderId,
        highestBidderName: finalBidderName,
        totalBids: listing.totalBids + 1,
        updatedAt: new Date().toISOString()
      };
      
      listings[listingIndex] = updatedListing;
      setStoredListings(listings);
      
      return updatedListing;
    }
  },

  // Auto-update auction statuses
  updateAuctionStatuses: async (): Promise<{ updatedCount: number; timestamp: string }> => {
    try {
      return await apiCall('/api/listings/update-statuses', {
        method: 'POST',
      });
    } catch (error) {
      console.warn('Backend not available for auto-update');
      return { updatedCount: 0, timestamp: new Date().toISOString() };
    }
  },
};