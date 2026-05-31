import { API_BASE_URL } from './api';

export interface PaymentOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export interface PaymentOrderResponse {
  success: boolean;
  order: PaymentOrder;
  key_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: {
    name: string;
    email: string;
  };
  theme: {
    color: string;
  };
}

export interface PaymentVerificationData {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  listingId?: string;
  bidAmount?: number;
}

export interface Payment {
  id: string;
  order_id: string;
  payment_id?: string;
  user_id: string;
  listing_id?: string;
  product_id?: string;
  amount: number;
  currency: string;
  status: string;
  type: string;
  method?: string;
  receipt: string;
  created_at: string;
  updated_at: string;
  listings?: {
    title: string;
    status: string;
  };
  products?: {
    name: string;
  };
}

class PaymentAPI {
  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    console.log('Auth token for payment API:', {
      hasToken: !!token,
      tokenLength: token?.length,
      tokenStart: token?.substring(0, 20) + '...',
      isValidFormat: this.isValidJWTFormat(token)
    });
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private isValidJWTFormat(token: string | null): boolean {
    if (!token) return false;
    try {
      const parts = token.split('.');
      return parts.length === 3 && parts.every(part => part.length > 0);
    } catch {
      return false;
    }
  }

  /**
   * Create payment order for auction bid
   */
  async createBidPaymentOrder(listingId: string, bidAmount: number): Promise<PaymentOrderResponse> {
    const response = await fetch(`${API_BASE_URL}/api/payments/create-order`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        listingId,
        bidAmount,
        type: 'bid_payment',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create payment order');
    }

    return response.json();
  }

  /**
   * Create payment order for listing fee
   */
  async createListingFeeOrder(productId: string, listingFee: number = 100): Promise<PaymentOrderResponse> {
    const response = await fetch(`${API_BASE_URL}/api/payments/create-listing-fee-order`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        productId,
        listingFee,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create listing fee order');
    }

    return response.json();
  }

  /**
   * Create payment order for completed purchase (auction winner payment)
   */
  async createPurchasePaymentOrder(
    purchaseId: string, 
    amount: number, 
    listingId: string, 
    productName: string
  ): Promise<PaymentOrderResponse> {
    const response = await fetch(`${API_BASE_URL}/api/payments/create-purchase-order`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        purchaseId,
        amount,
        listingId,
        productName,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create purchase payment order');
    }

    return response.json();
  }

  /**
   * Verify purchase payment and complete transaction
   */
  async verifyPurchasePayment(verificationData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    purchaseId: string;
  }): Promise<any> {
    // Retry logic for verification
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Payment verification attempt ${attempt}/3`);
        
        // Validate token format before making request
        const token = localStorage.getItem('auth_token');
        if (!this.isValidJWTFormat(token)) {
          throw new Error('Invalid authentication token format');
        }

        const response = await fetch(`${API_BASE_URL}/api/payments/verify-purchase-payment`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(verificationData),
        });

        if (!response.ok) {
          const error = await response.json();
          
          // If it's an auth error and we have retries left, wait and retry
          if (response.status === 401 && attempt < 3) {
            console.log(`Auth error on attempt ${attempt}, retrying in ${attempt * 1000}ms...`);
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
            continue;
          }
          
          throw new Error(error.error || 'Purchase payment verification failed');
        }

        const result = await response.json();
        console.log('Payment verification successful on attempt', attempt);
        return result;
        
      } catch (error) {
        console.error(`Payment verification attempt ${attempt} failed:`, error);
        
        // If this is the last attempt, throw the error
        if (attempt === 3) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  /**
   * Verify payment and complete transaction
   */
  async verifyPayment(verificationData: PaymentVerificationData): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/payments/verify-payment`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(verificationData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Payment verification failed');
    }

    return response.json();
  }

  /**
   * Get user's payment history with advanced filtering
   */
  async getPaymentHistory(
    page: number = 1, 
    limit: number = 20, 
    type?: string,
    status?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<{
    payments: Payment[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (type) params.append('type', type);
    if (status) params.append('status', status);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    const response = await fetch(`${API_BASE_URL}/api/payments/history?${params}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch payment history');
    }

    return response.json();
  }

  /**
   * Get payment analytics and summary
   */
  async getPaymentAnalytics(period: string = '30d'): Promise<{
    totalPayments: number;
    totalAmount: number;
    successfulPayments: number;
    failedPayments: number;
    pendingPayments: number;
    totalEarnings: number;
    thisMonthEarnings: number;
    averageTransactionValue: number;
    byType: Record<string, number>;
    byMethod: Record<string, number>;
    recentTransactions: Array<{
      id: string;
      amount: number;
      status: string;
      type: string;
      method?: string;
      createdAt: string;
      productName: string;
    }>;
    monthlyTrend: Array<{ month: string; amount: number; count: number }>;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/payments/analytics?period=${period}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch payment analytics');
    }

    return response.json();
  }

  /**
   * Create refund for a payment
   */
  async createRefund(paymentId: string, amount?: number, reason?: string): Promise<{
    success: boolean;
    message: string;
    refund: {
      id: string;
      amount: number;
      status: string;
    };
  }> {
    const response = await fetch(`${API_BASE_URL}/api/payments/refund/${paymentId}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ amount, reason }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create refund');
    }

    return response.json();
  }

  /**
   * Get seller earnings and payout information
   */
  async getSellerEarnings(period: string = '30d'): Promise<{
    grossEarnings: number;
    platformCommission: number;
    netEarnings: number;
    totalListingFees: number;
    totalAuctions: number;
    averageAuctionValue: number;
    recentSales: Array<{
      id: string;
      title: string;
      amount: number;
      date: string;
    }>;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/payments/seller-earnings?period=${period}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch seller earnings');
    }

    return response.json();
  }

  /**
   * Get user's purchased products (products they now own after successful payments)
   */
  async getPurchasedProducts(page: number = 1, limit: number = 20): Promise<{
    ownedProducts: Array<{
      id: string;
      name: string;
      description: string;
      currentValue: number;
      category: string;
      image: string;
      status: string;
      purchaseDate: string;
      canResell: boolean;
      createdAt: string;
      updatedAt: string;
    }>;
    purchaseHistory: Array<{
      id: string;
      amount: number;
      status: string;
      created_at: string;
      listing_id: string;
      notes: any;
    }>;
    total: number;
    page: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/payments/purchased-products?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch purchased products');
    }

    return response.json();
  }

  /**
   * Initialize Razorpay payment
   */
  async initializeRazorpayPayment(
    orderData: PaymentOrderResponse,
    onSuccess: (response: any) => void,
    onError: (error: any) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Initializing Razorpay payment with order data:', orderData);
      
      // Check if Razorpay is loaded
      if (typeof (window as any).Razorpay === 'undefined') {
        console.error('Razorpay SDK not loaded');
        reject(new Error('Razorpay SDK not loaded'));
        return;
      }

      console.log('Razorpay SDK is loaded, creating payment options...');

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: orderData.name,
        description: orderData.description,
        order_id: orderData.order.id,
        prefill: orderData.prefill,
        theme: orderData.theme,
        config: {
          display: {
            blocks: {
              upi_block: {
                name: 'Pay via UPI / QR',
                instruments: [
                  { method: 'upi', flows: ['qr', 'collect', 'intent'] },
                ],
              },
            },
            sequence: ['block.upi_block'],
            preferences: { show_default_blocks: true },
          },
        },
        handler: (response: any) => {
          console.log('Razorpay payment success:', response);
          onSuccess(response);
          resolve();
        },
        modal: {
          ondismiss: () => {
            console.log('Razorpay payment modal dismissed by user');
            onError({ error: 'Payment cancelled by user' });
            resolve();
          },
        },
      };

      console.log('Creating Razorpay instance with options:', options);
      
      const razorpay = new (window as any).Razorpay(options);
      
      razorpay.on('payment.failed', (response: any) => {
        console.error('Razorpay payment failed:', response);
        onError(response.error);
        resolve();
      });

      console.log('Opening Razorpay payment modal...');
      razorpay.open();
    });
  }

  /**
   * Load Razorpay SDK
   */
  loadRazorpaySDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (typeof (window as any).Razorpay !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
      document.head.appendChild(script);
    });
  }
}

export const paymentAPI = new PaymentAPI();