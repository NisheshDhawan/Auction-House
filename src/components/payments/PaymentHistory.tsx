import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { paymentAPI, Payment } from '@/services/paymentAPI';
import { toast } from 'sonner';

const PaymentHistory = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const fetchPayments = async (currentPage = 1, type?: string) => {
    try {
      setLoading(true);
      const response = await paymentAPI.getPaymentHistory(
        currentPage,
        20,
        type === 'all' ? undefined : type
      );
      
      setPayments(response.payments);
      setTotalPages(response.totalPages);
      setPage(response.page);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to fetch payment history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments(1, typeFilter);
  }, [typeFilter]);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'captured':
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'created':
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <CreditCard className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';
    
    if (statusLower === 'captured' || statusLower === 'success') {
      variant = 'default';
    } else if (statusLower === 'failed' || statusLower === 'error') {
      variant = 'destructive';
    } else if (statusLower === 'created' || statusLower === 'pending') {
      variant = 'secondary';
    }

    return (
      <Badge variant={variant} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'bid_payment':
        return 'Bid Payment';
      case 'listing_fee':
        return 'Listing Fee';
      case 'commission':
        return 'Commission';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const getItemName = (payment: Payment) => {
    if (payment.listings?.title) {
      return payment.listings.title;
    }
    if (payment.products?.name) {
      return payment.products.name;
    }
    return 'Unknown Item';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payment History</h2>
          <p className="text-muted-foreground">Track all your payments and transactions</p>
        </div>
        
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="bid_payment">Bid Payments</SelectItem>
              <SelectItem value="listing_fee">Listing Fees</SelectItem>
              <SelectItem value="commission">Commissions</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchPayments(page, typeFilter)}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[...Array(5)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded w-1/3"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                    <div className="h-3 bg-muted rounded w-1/4"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-6 bg-muted rounded w-20"></div>
                    <div className="h-4 bg-muted rounded w-16"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No payments found</h3>
            <p className="text-muted-foreground">
              {typeFilter === 'all' 
                ? "You haven't made any payments yet."
                : `No ${getTypeLabel(typeFilter).toLowerCase()} found.`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {payments.map((payment) => (
            <Card key={payment.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{getItemName(payment)}</h3>
                      <Badge variant="outline">{getTypeLabel(payment.type)}</Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Order ID: <span className="font-mono">{payment.order_id}</span></p>
                      {payment.payment_id && (
                        <p>Payment ID: <span className="font-mono">{payment.payment_id}</span></p>
                      )}
                      <p>Date: {new Date(payment.created_at).toLocaleString()}</p>
                      {payment.method && (
                        <p>Method: {payment.method.toUpperCase()}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right space-y-2">
                    {getStatusBadge(payment.status)}
                    <div className="text-lg font-bold">
                      ₹{payment.amount.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {payment.currency}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => fetchPayments(page - 1, typeFilter)}
            disabled={page <= 1 || loading}
          >
            Previous
          </Button>
          
          <div className="flex items-center gap-2">
            {[...Array(Math.min(5, totalPages))].map((_, index) => {
              const pageNum = Math.max(1, page - 2) + index;
              if (pageNum > totalPages) return null;
              
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => fetchPayments(pageNum, typeFilter)}
                  disabled={loading}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            onClick={() => fetchPayments(page + 1, typeFilter)}
            disabled={page >= totalPages || loading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default PaymentHistory;