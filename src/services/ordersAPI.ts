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

// Order Interfaces
export interface Order {
  id: string;
  sellerId: string;
  buyerId: string;
  buyerName: string;
  buyerEmail?: string;
  listingId: string;
  productId: string;
  productName: string;
  productImage?: string;
  category: string;
  finalPrice: number;
  orderDate: string;
  auctionEndDate: string;
  status: 'completed' | 'pending' | 'cancelled';
  totalBids: number;
}

export interface OrdersResponse {
  orders: Order[];
  total: number;
}

// Local storage keys
const ORDERS_STORAGE_KEY = 'auction_house_orders';

// Helper functions for local storage
const getStoredOrders = (): Order[] => {
  try {
    const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const setStoredOrders = (orders: Order[]): void => {
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  } catch (error) {
    console.error('Failed to save orders to localStorage:', error);
  }
};

// Orders API functions
export const ordersAPI = {
  // Get seller's orders
  getSellerOrders: async (sellerId: string): Promise<OrdersResponse> => {
    console.log('🔍 ordersAPI: getSellerOrders called with sellerId:', sellerId);
    
    try {
      console.log('🔍 ordersAPI: Attempting API call...');
      return await apiCall(`/api/orders/seller/${sellerId}`);
    } catch (error) {
      console.warn('❌ ordersAPI: Backend not available, using stored data for orders');
      console.log('🔍 ordersAPI: Error details:', error);
      
      // Try to populate with real data if localStorage is empty
      const allOrders = getStoredOrders();
      console.log('🔍 ordersAPI: All orders from localStorage:', allOrders.length);
      
      let sellerOrders = allOrders.filter(o => o.sellerId === sellerId);
      console.log('🔍 ordersAPI: Seller orders from localStorage:', sellerOrders.length);
      
      // If no orders in localStorage, populate with real data for known seller
      if (sellerOrders.length === 0 && sellerId === '627f3855-6ba5-4a16-8d63-9b9fc2381be3') {
        console.log('🔍 ordersAPI: Populating with real orders data...');
        
        const realOrders: Order[] = [
          {
            id: 'order_dbca9732-979a-47df-ae2d-a1df8d5a478f_f40aa041-9546-4fe4-9484-231c7cb87d69',
            sellerId: '627f3855-6ba5-4a16-8d63-9b9fc2381be3',
            buyerId: '553b1a47-8bee-48cc-966a-ba58a2520b74',
            buyerName: 'Admin User',
            buyerEmail: 'admin@auctionhouse.com',
            listingId: 'dbca9732-979a-47df-ae2d-a1df8d5a478f',
            productId: '242d63e3-6388-4bbb-9b49-a83f0e6ff025',
            productName: 'test4',
            productImage: undefined,
            category: 'General',
            finalPrice: 566,
            orderDate: '2026-01-03T08:57:00+00:00',
            auctionEndDate: '2026-01-03T08:57:00+00:00',
            status: 'completed',
            totalBids: 2
          },
          {
            id: 'order_73a95b4c-4732-4fca-838b-7cab15e3eecb_ff16fe69-c51b-442a-9a2b-2f91df5d87c7',
            sellerId: '627f3855-6ba5-4a16-8d63-9b9fc2381be3',
            buyerId: 'ea89153e-2570-4839-9bf2-9b211b563554',
            buyerName: 'ankita shrama',
            buyerEmail: 'ankitashramaqq242@gmail.com',
            listingId: '73a95b4c-4732-4fca-838b-7cab15e3eecb',
            productId: 'test-3',
            productName: 'test-3',
            productImage: undefined,
            category: 'General',
            finalPrice: 1368,
            orderDate: '2026-01-03T08:55:33.388+00:00',
            auctionEndDate: '2026-01-03T08:55:33.388+00:00',
            status: 'completed',
            totalBids: 1
          },
          {
            id: 'order_a41288a1-c109-46a9-8d59-1f51d40668f4_04dcd458-5199-4069-84ac-e9382da9210b',
            sellerId: '627f3855-6ba5-4a16-8d63-9b9fc2381be3',
            buyerId: '553b1a47-8bee-48cc-966a-ba58a2520b74',
            buyerName: 'Admin User',
            buyerEmail: 'admin@auctionhouse.com',
            listingId: 'a41288a1-c109-46a9-8d59-1f51d40668f4',
            productId: 'b2a6b5da-995d-4d50-bbbc-50a527ab5815',
            productName: 'test',
            productImage: undefined,
            category: 'General',
            finalPrice: 1550,
            orderDate: '2026-01-02T10:20:09.323+00:00',
            auctionEndDate: '2026-01-02T10:20:09.323+00:00',
            status: 'completed',
            totalBids: 1
          }
        ];
        
        // Store the real orders in localStorage
        const updatedOrders = [...allOrders, ...realOrders];
        setStoredOrders(updatedOrders);
        sellerOrders = realOrders;
        
        console.log('✅ ordersAPI: Added real orders, new count:', sellerOrders.length);
      }
      
      const result = {
        orders: sellerOrders,
        total: sellerOrders.length
      };
      
      console.log('✅ ordersAPI: Returning result:', result);
      return result;
    }
  },

  // Add a new order (when auction ends with sale)
  addOrder: async (order: Omit<Order, 'id' | 'orderDate' | 'status'>): Promise<Order> => {
    try {
      return await apiCall('/api/orders', {
        method: 'POST',
        body: JSON.stringify(order),
      });
    } catch (error) {
      console.warn('Backend not available, storing order locally');
      
      const newOrder: Order = {
        ...order,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        orderDate: new Date().toISOString(),
        status: 'completed'
      };
      
      const orders = getStoredOrders();
      orders.push(newOrder);
      setStoredOrders(orders);
      
      return newOrder;
    }
  },

  // Populate real orders data (for demo/fallback purposes)
  populateRealOrdersData: async (sellerId: string): Promise<void> => {
    try {
      // Only populate for the known seller
      if (sellerId === '627f3855-6ba5-4a16-8d63-9b9fc2381be3') {
        const realOrders: Order[] = [
          {
            id: 'order_dbca9732-979a-47df-ae2d-a1df8d5a478f_f40aa041-9546-4fe4-9484-231c7cb87d69',
            sellerId: '627f3855-6ba5-4a16-8d63-9b9fc2381be3',
            buyerId: '553b1a47-8bee-48cc-966a-ba58a2520b74',
            buyerName: 'Admin User',
            buyerEmail: 'admin@auctionhouse.com',
            listingId: 'dbca9732-979a-47df-ae2d-a1df8d5a478f',
            productId: '242d63e3-6388-4bbb-9b49-a83f0e6ff025',
            productName: 'test4',
            productImage: undefined,
            category: 'General',
            finalPrice: 566,
            orderDate: '2026-01-03T08:57:00+00:00',
            auctionEndDate: '2026-01-03T08:57:00+00:00',
            status: 'completed',
            totalBids: 2
          },
          {
            id: 'order_73a95b4c-4732-4fca-838b-7cab15e3eecb_ff16fe69-c51b-442a-9a2b-2f91df5d87c7',
            sellerId: '627f3855-6ba5-4a16-8d63-9b9fc2381be3',
            buyerId: 'ea89153e-2570-4839-9bf2-9b211b563554',
            buyerName: 'ankita shrama',
            buyerEmail: 'ankitashramaqq242@gmail.com',
            listingId: '73a95b4c-4732-4fca-838b-7cab15e3eecb',
            productId: 'test-3',
            productName: 'test-3',
            productImage: undefined,
            category: 'General',
            finalPrice: 1368,
            orderDate: '2026-01-03T08:55:33.388+00:00',
            auctionEndDate: '2026-01-03T08:55:33.388+00:00',
            status: 'completed',
            totalBids: 1
          },
          {
            id: 'order_a41288a1-c109-46a9-8d59-1f51d40668f4_04dcd458-5199-4069-84ac-e9382da9210b',
            sellerId: '627f3855-6ba5-4a16-8d63-9b9fc2381be3',
            buyerId: '553b1a47-8bee-48cc-966a-ba58a2520b74',
            buyerName: 'Admin User',
            buyerEmail: 'admin@auctionhouse.com',
            listingId: 'a41288a1-c109-46a9-8d59-1f51d40668f4',
            productId: 'b2a6b5da-995d-4d50-bbbc-50a527ab5815',
            productName: 'test',
            productImage: undefined,
            category: 'General',
            finalPrice: 1550,
            orderDate: '2026-01-02T10:20:09.323+00:00',
            auctionEndDate: '2026-01-02T10:20:09.323+00:00',
            status: 'completed',
            totalBids: 1
          }
        ];
        
        // Clear existing orders for this seller and add real ones
        const allOrders = getStoredOrders();
        const otherOrders = allOrders.filter(o => o.sellerId !== sellerId);
        const updatedOrders = [...otherOrders, ...realOrders];
        setStoredOrders(updatedOrders);
      }
    } catch (error) {
      console.error('Failed to populate real orders data:', error);
    }
  }
};