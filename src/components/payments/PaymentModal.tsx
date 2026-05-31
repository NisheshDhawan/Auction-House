import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Shield, Clock, CheckCircle } from 'lucide-react';
import { paymentAPI, PaymentOrderResponse } from '@/services/paymentAPI';
import { toast } from 'sonner';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: PaymentOrderResponse | null;
  onPaymentSuccess: (response: any) => void;
  onPaymentError: (error: any) => void;
  type: 'bid' | 'listing_fee';
  itemName: string;
}

const PaymentModal = ({
  isOpen,
  onClose,
  orderData,
  onPaymentSuccess,
  onPaymentError,
  type,
  itemName,
}: PaymentModalProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  const handlePayment = async () => {
    if (!orderData) {
      toast.error('Payment order not found');
      return;
    }

    try {
      setIsProcessing(true);
      setPaymentStatus('processing');

      // Load Razorpay SDK if not already loaded
      await paymentAPI.loadRazorpaySDK();

      // Initialize Razorpay payment
      await paymentAPI.initializeRazorpayPayment(
        orderData,
        (response) => {
          console.log('Payment successful:', response);
          setPaymentStatus('success');
          setIsProcessing(false);
          onPaymentSuccess(response);
          toast.success('Payment completed successfully!');
        },
        (error) => {
          console.error('Payment failed:', error);
          setPaymentStatus('error');
          setIsProcessing(false);
          onPaymentError(error);
          toast.error(error.description || 'Payment failed');
        }
      );
    } catch (error) {
      console.error('Payment initialization error:', error);
      setPaymentStatus('error');
      setIsProcessing(false);
      toast.error('Failed to initialize payment');
    }
  };

  const getPaymentTypeInfo = () => {
    switch (type) {
      case 'bid':
        return {
          title: 'Place Bid Payment',
          description: 'Complete payment to place your bid',
          icon: <CreditCard className="w-5 h-5" />,
          color: 'bg-blue-500',
        };
      case 'listing_fee':
        return {
          title: 'Listing Fee Payment',
          description: 'Pay listing fee to publish your auction',
          icon: <Shield className="w-5 h-5" />,
          color: 'bg-green-500',
        };
      default:
        return {
          title: 'Payment',
          description: 'Complete your payment',
          icon: <CreditCard className="w-5 h-5" />,
          color: 'bg-gray-500',
        };
    }
  };

  const paymentInfo = getPaymentTypeInfo();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {paymentInfo.icon}
            {paymentInfo.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Status */}
          {paymentStatus !== 'idle' && (
            <div className="flex items-center justify-center p-4 rounded-lg bg-muted">
              {paymentStatus === 'processing' && (
                <div className="flex items-center gap-2 text-blue-600">
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Processing payment...</span>
                </div>
              )}
              {paymentStatus === 'success' && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Payment successful!</span>
                </div>
              )}
              {paymentStatus === 'error' && (
                <div className="flex items-center gap-2 text-red-600">
                  <span>Payment failed. Please try again.</span>
                </div>
              )}
            </div>
          )}

          {/* Order Details */}
          {orderData && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-card">
                <h3 className="font-semibold mb-2">Payment Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Item:</span>
                    <span className="font-medium">{itemName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-bold text-lg">₹{orderData.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order ID:</span>
                    <span className="font-mono text-xs">{orderData.order.id}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method Info */}
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-sm">Secure Payment by Razorpay</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your payment is secured with 256-bit SSL encryption. We support UPI, Cards, Net Banking, and Wallets.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handlePayment}
                  disabled={isProcessing || paymentStatus === 'success'}
                  className="flex-1"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : paymentStatus === 'success' ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Completed
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pay ₹{orderData.amount.toLocaleString()}
                    </>
                  )}
                </Button>
                
                {paymentStatus !== 'processing' && (
                  <Button
                    variant="outline"
                    onClick={onClose}
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Payment Methods */}
          <div className="grid grid-cols-4 gap-2">
            {['UPI', 'Cards', 'NetBanking', 'Wallets'].map((method) => (
              <Badge key={method} variant="outline" className="justify-center py-1">
                {method}
              </Badge>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;