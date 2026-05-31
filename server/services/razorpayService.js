import Razorpay from 'razorpay';
import crypto from 'crypto';

export class RazorpayService {
  constructor() {
    this.razorpay = null;
  }

  // Initialize Razorpay instance lazily
  getRazorpayInstance() {
    if (!this.razorpay) {
      console.log('Initializing Razorpay with:', {
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET ? 'Set' : 'Not set'
      });

      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!keyId || !keySecret) {
        throw new Error('Razorpay credentials not found in environment variables');
      }

      console.log('Using Razorpay credentials:', {
        key_id: keyId,
        key_secret: keySecret ? 'Set' : 'Not set'
      });

      this.razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
    }
    return this.razorpay;
  }
  /**
   * Create a payment order for auction bid payment
   * @param {Object} orderData - Order details
   * @param {number} orderData.amount - Amount in paise (multiply by 100)
   * @param {string} orderData.currency - Currency code (default: INR)
   * @param {string} orderData.receipt - Unique receipt ID
   * @param {Object} orderData.notes - Additional notes
   * @returns {Promise<Object>} Razorpay order object
   */
  async createOrder({ amount, currency = 'INR', receipt, notes = {} }) {
    try {
      const razorpay = this.getRazorpayInstance();
      
      const options = {
        amount: Math.round(amount * 100), // Convert to paise
        currency,
        receipt,
        notes,
        payment_capture: 1, // Auto capture payment
      };

      console.log('Creating Razorpay order with options:', options);
      const order = await razorpay.orders.create(options);
      console.log('Razorpay order created:', order);
      
      return {
        success: true,
        order,
      };
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify payment signature
   * @param {Object} paymentData - Payment verification data
   * @param {string} paymentData.razorpay_order_id - Order ID
   * @param {string} paymentData.razorpay_payment_id - Payment ID
   * @param {string} paymentData.razorpay_signature - Payment signature
   * @returns {boolean} Verification result
   */
  verifyPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    try {
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!keySecret) {
        console.error('RAZORPAY_KEY_SECRET not found in environment variables');
        return false;
      }

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        console.error('Missing required payment verification parameters:', {
          razorpay_order_id: !!razorpay_order_id,
          razorpay_payment_id: !!razorpay_payment_id,
          razorpay_signature: !!razorpay_signature,
        });
        return false;
      }

      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(body.toString())
        .digest('hex');

      const isValid = expectedSignature === razorpay_signature;
      console.log('Payment verification:', {
        keySecret: keySecret ? 'Set' : 'Not set',
        body,
        expected: expectedSignature,
        received: razorpay_signature,
        isValid,
      });

      return isValid;
    } catch (error) {
      console.error('Error verifying payment:', error);
      return false;
    }
  }

  /**
   * Get payment details
   * @param {string} paymentId - Razorpay payment ID
   * @returns {Promise<Object>} Payment details
   */
  async getPayment(paymentId) {
    try {
      const razorpay = this.getRazorpayInstance();
      const payment = await razorpay.payments.fetch(paymentId);
      return {
        success: true,
        payment,
      };
    } catch (error) {
      console.error('Error fetching payment:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create refund for a payment
   * @param {string} paymentId - Razorpay payment ID
   * @param {number} amount - Refund amount in paise (optional, full refund if not provided)
   * @param {Object} notes - Additional notes
   * @returns {Promise<Object>} Refund details
   */
  async createRefund(paymentId, amount = null, notes = {}) {
    try {
      const razorpay = this.getRazorpayInstance();
      
      const refundData = {
        notes,
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100); // Convert to paise
      }

      const refund = await razorpay.payments.refund(paymentId, refundData);
      return {
        success: true,
        refund,
      };
    } catch (error) {
      console.error('Error creating refund:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create transfer to seller account (for marketplace model)
   * @param {Object} transferData - Transfer details
   * @param {string} transferData.account - Seller's account ID
   * @param {number} transferData.amount - Amount in paise
   * @param {string} transferData.currency - Currency code
   * @returns {Promise<Object>} Transfer details
   */
  async createTransfer({ account, amount, currency = 'INR' }) {
    try {
      const razorpay = this.getRazorpayInstance();
      
      const transfer = await razorpay.transfers.create({
        account,
        amount: Math.round(amount * 100),
        currency,
      });

      return {
        success: true,
        transfer,
      };
    } catch (error) {
      console.error('Error creating transfer:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export const razorpayService = new RazorpayService();