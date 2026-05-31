import { useState } from 'react';
import { paymentAPI, PaymentOrderResponse } from '@/services/paymentAPI';
import { toast } from 'sonner';

export const usePayment = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<PaymentOrderResponse | null>(null);

  /**
   * Create and process bid payment
   */
  const processBidPayment = async (
    listingId: string,
    bidAmount: number,
    onSuccess?: (response: any) => void,
    onError?: (error: any) => void
  ) => {
    try {
      setIsLoading(true);
      
      // Create payment order
      const orderData = await paymentAPI.createBidPaymentOrder(listingId, bidAmount);
      setPaymentOrder(orderData);

      // Load Razorpay SDK
      await paymentAPI.loadRazorpaySDK();

      // Initialize payment
      await paymentAPI.initializeRazorpayPayment(
        orderData,
        async (razorpayResponse) => {
          try {
            // Verify payment on backend
            const verificationResult = await paymentAPI.verifyPayment({
              razorpay_order_id: razorpayResponse.razorpay_order_id,
              razorpay_payment_id: razorpayResponse.razorpay_payment_id,
              razorpay_signature: razorpayResponse.razorpay_signature,
              listingId,
              bidAmount,
            });

            toast.success('Bid placed successfully!');
            onSuccess?.(verificationResult);
          } catch (verificationError) {
            console.error('Payment verification failed:', verificationError);
            toast.error('Payment verification failed');
            onError?.(verificationError);
          }
        },
        (error) => {
          console.error('Payment failed:', error);
          toast.error(error.description || 'Payment failed');
          onError?.(error);
        }
      );
    } catch (error) {
      console.error('Payment process error:', error);
      toast.error('Failed to process payment');
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Create and process listing fee payment
   */
  const processListingFeePayment = async (
    productId: string,
    listingFee: number = 100,
    onSuccess?: (response: any) => void,
    onError?: (error: any) => void
  ) => {
    try {
      setIsLoading(true);
      
      // Create payment order
      const orderData = await paymentAPI.createListingFeeOrder(productId, listingFee);
      setPaymentOrder(orderData);

      // Load Razorpay SDK
      await paymentAPI.loadRazorpaySDK();

      // Initialize payment
      await paymentAPI.initializeRazorpayPayment(
        orderData,
        async (razorpayResponse) => {
          try {
            // Verify payment on backend
            const verificationResult = await paymentAPI.verifyPayment({
              razorpay_order_id: razorpayResponse.razorpay_order_id,
              razorpay_payment_id: razorpayResponse.razorpay_payment_id,
              razorpay_signature: razorpayResponse.razorpay_signature,
            });

            toast.success('Listing fee paid successfully!');
            onSuccess?.(verificationResult);
          } catch (verificationError) {
            console.error('Payment verification failed:', verificationError);
            toast.error('Payment verification failed');
            onError?.(verificationError);
          }
        },
        (error) => {
          console.error('Payment failed:', error);
          toast.error(error.description || 'Payment failed');
          onError?.(error);
        }
      );
    } catch (error) {
      console.error('Payment process error:', error);
      toast.error('Failed to process payment');
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Create and process purchase payment (for auction winners)
   */
  const processPurchasePayment = async (
    purchaseId: string,
    amount: number,
    listingId: string,
    productName: string,
    onSuccess?: (response: any) => void,
    onError?: (error: any) => void
  ) => {
    try {
      setIsLoading(true);
      
      // Create payment order
      const orderData = await paymentAPI.createPurchasePaymentOrder(purchaseId, amount, listingId, productName);
      setPaymentOrder(orderData);

      // Load Razorpay SDK
      await paymentAPI.loadRazorpaySDK();

      // Initialize payment
      await paymentAPI.initializeRazorpayPayment(
        orderData,
        async (razorpayResponse) => {
          try {
            // Verify payment on backend
            const verificationResult = await paymentAPI.verifyPurchasePayment({
              razorpay_order_id: razorpayResponse.razorpay_order_id,
              razorpay_payment_id: razorpayResponse.razorpay_payment_id,
              razorpay_signature: razorpayResponse.razorpay_signature,
              purchaseId,
            });

            toast.success('Purchase payment completed successfully!');
            onSuccess?.(verificationResult);
          } catch (verificationError) {
            console.error('Payment verification failed:', verificationError);
            toast.error('Payment verification failed');
            onError?.(verificationError);
          }
        },
        (error) => {
          console.error('Payment failed:', error);
          toast.error(error.description || 'Payment failed');
          onError?.(error);
        }
      );
    } catch (error) {
      console.error('Payment process error:', error);
      toast.error('Failed to process payment');
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Create payment order only (for manual handling)
   */
  const createBidPaymentOrder = async (listingId: string, bidAmount: number) => {
    try {
      setIsLoading(true);
      const orderData = await paymentAPI.createBidPaymentOrder(listingId, bidAmount);
      setPaymentOrder(orderData);
      return orderData;
    } catch (error) {
      console.error('Error creating payment order:', error);
      toast.error('Failed to create payment order');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Create listing fee order only (for manual handling)
   */
  const createListingFeeOrder = async (productId: string, listingFee: number = 100) => {
    try {
      setIsLoading(true);
      const orderData = await paymentAPI.createListingFeeOrder(productId, listingFee);
      setPaymentOrder(orderData);
      return orderData;
    } catch (error) {
      console.error('Error creating listing fee order:', error);
      toast.error('Failed to create listing fee order');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Verify payment manually
   */
  const verifyPayment = async (verificationData: any) => {
    try {
      setIsLoading(true);
      const result = await paymentAPI.verifyPayment(verificationData);
      return result;
    } catch (error) {
      console.error('Payment verification error:', error);
      toast.error('Payment verification failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get payment analytics
   */
  const getPaymentAnalytics = async (period: string = '30d') => {
    try {
      setIsLoading(true);
      const analytics = await paymentAPI.getPaymentAnalytics(period);
      return analytics;
    } catch (error) {
      console.error('Error fetching payment analytics:', error);
      toast.error('Failed to fetch payment analytics');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get seller earnings
   */
  const getSellerEarnings = async (period: string = '30d') => {
    try {
      setIsLoading(true);
      const earnings = await paymentAPI.getSellerEarnings(period);
      return earnings;
    } catch (error) {
      console.error('Error fetching seller earnings:', error);
      toast.error('Failed to fetch seller earnings');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Create refund
   */
  const createRefund = async (paymentId: string, amount?: number, reason?: string) => {
    try {
      setIsLoading(true);
      const result = await paymentAPI.createRefund(paymentId, amount, reason);
      toast.success('Refund processed successfully');
      return result;
    } catch (error) {
      console.error('Error creating refund:', error);
      toast.error('Failed to process refund');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get payment history with filters
   */
  const getPaymentHistory = async (
    page: number = 1,
    limit: number = 20,
    type?: string,
    status?: string,
    dateFrom?: string,
    dateTo?: string
  ) => {
    try {
      setIsLoading(true);
      const history = await paymentAPI.getPaymentHistory(page, limit, type, status, dateFrom, dateTo);
      return history;
    } catch (error) {
      console.error('Error fetching payment history:', error);
      toast.error('Failed to fetch payment history');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get user's purchased products (products they now own)
   */
  const getPurchasedProducts = async (page: number = 1, limit: number = 20) => {
    try {
      setIsLoading(true);
      const result = await paymentAPI.getPurchasedProducts(page, limit);
      return result;
    } catch (error) {
      console.error('Error fetching purchased products:', error);
      toast.error('Failed to fetch purchased products');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    paymentOrder,
    processBidPayment,
    processListingFeePayment,
    processPurchasePayment,
    createBidPaymentOrder,
    createListingFeeOrder,
    verifyPayment,
    getPaymentAnalytics,
    getSellerEarnings,
    createRefund,
    getPaymentHistory,
    getPurchasedProducts,
    setPaymentOrder,
  };
};