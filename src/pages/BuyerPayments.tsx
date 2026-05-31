import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  CreditCard, 
  History, 
  RefreshCw, 
  Calendar,
  Filter,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Receipt,
  Wallet
} from 'lucide-react';
import { paymentAPI, Payment } from '@/services/paymentAPI';
import { toast } from 'sonner';

interface PaymentAnalytics {
  totalPayments: number;
  totalAmount: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
  byType: Record<string, number>;
  byMethod: Record<string, number>;
  monthlyTrend: Array<{ month: string; amount: number; count: number }>;
}

const BuyerPayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [analytics, setAnalytics] = useState<PaymentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    dateFrom: '',
    dateTo: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const fetchPayments = async (currentPage = 1, currentFilters = filters) => {
    try {
      setLoading(true);
      const response = await paymentAPI.getPaymentHistory(
        currentPage,
        20,
        currentFilters.type === 'all' ? undefined : currentFilters.type,
        currentFilters.status === 'all' ? undefined : currentFilters.status,
        currentFilters.dateFrom || undefined,
        currentFilters.dateTo || undefined
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

  const fetchAnalytics = async () => {
    try {
      const analyticsData = await paymentAPI.getPaymentAnalytics('30d');
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to fetch payment analytics');
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchAnalytics();
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);
    fetchPayments(1, newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      type: 'all',
      status: 'all',
      dateFrom: '',
      dateTo: '',
    };
    setFilters(clearedFilters);
    setPage(1);
    fetchPayments(1, clearedFilters);
  };

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const exportPayments = () => {
    // Create CSV content
    const headers = ['Date', 'Type', 'Item', 'Amount', 'Status', 'Payment ID', 'Order ID'];
    const csvContent = [
      headers.join(','),
      ...payments.map(payment => [
        new Date(payment.created_at).toLocaleDateString(),
        getTypeLabel(payment.type),
        getItemName(payment),
        payment.amount,
        payment.status,
        payment.payment_id || '',
        payment.order_id
      ].join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Payment History</h1>
          <p className="text-muted-foreground">Track all your payments and transactions</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
          </Button>
          
          <Button
            variant="outline"
            onClick={exportPayments}
            disabled={payments.length === 0}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              fetchPayments(page);
              fetchAnalytics();
            }}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Analytics Overview */}
      {analytics && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
                  <p className="text-2xl font-bold">{formatCurrency(analytics.totalAmount)}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Wallet className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="flex items-center mt-2 text-sm">
                <span className="text-muted-foreground">
                  {analytics.totalPayments} transactions
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Successful</p>
                  <p className="text-2xl font-bold text-green-600">{analytics.successfulPayments}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="flex items-center mt-2 text-sm">
                <span className="text-green-600">
                  {analytics.totalPayments > 0 
                    ? Math.round((analytics.successfulPayments / analytics.totalPayments) * 100)
                    : 0}% success rate
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{analytics.pendingPayments}</p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
              <div className="flex items-center mt-2 text-sm">
                <span className="text-muted-foreground">Awaiting confirmation</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{analytics.failedPayments}</p>
                </div>
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <div className="flex items-center mt-2 text-sm">
                <span className="text-muted-foreground">Need attention</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter Payments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <Label htmlFor="type-filter">Payment Type</Label>
                <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="bid_payment">Bid Payments</SelectItem>
                    <SelectItem value="listing_fee">Listing Fees</SelectItem>
                    <SelectItem value="commission">Commissions</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status-filter">Status</Label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="captured">Successful</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date-from">From Date</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="date-to">To Date</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={clearFilters} variant="outline" size="sm">
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment List */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="flex justify-between items-start p-4 border rounded-lg">
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
                </div>
              ))}
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No payments found</h3>
              <p className="text-muted-foreground">
                {Object.values(filters).some(f => f && f !== 'all') 
                  ? "No payments match your current filters."
                  : "You haven't made any payments yet."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div key={payment.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{getItemName(payment)}</h3>
                        <Badge variant="outline">{getTypeLabel(payment.type)}</Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Date: {new Date(payment.created_at).toLocaleString()}</p>
                        {payment.method && (
                          <p>Method: {payment.method.toUpperCase()}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right space-y-2">
                      {getStatusBadge(payment.status)}
                      <div className="text-lg font-bold">
                        {formatCurrency(payment.amount)}
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedPayment(payment)}
                          >
                            <Receipt className="w-4 h-4 mr-1" />
                            Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Payment Details</DialogTitle>
                          </DialogHeader>
                          {selectedPayment && (
                            <div className="space-y-4">
                              <div className="grid gap-3">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Item:</span>
                                  <span className="font-medium">{getItemName(selectedPayment)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Type:</span>
                                  <Badge variant="outline">{getTypeLabel(selectedPayment.type)}</Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Amount:</span>
                                  <span className="font-bold">{formatCurrency(selectedPayment.amount)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Status:</span>
                                  {getStatusBadge(selectedPayment.status)}
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Date:</span>
                                  <span>{new Date(selectedPayment.created_at).toLocaleString()}</span>
                                </div>
                                {selectedPayment.payment_id && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Payment ID:</span>
                                    <span className="font-mono text-xs">{selectedPayment.payment_id}</span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Order ID:</span>
                                  <span className="font-mono text-xs">{selectedPayment.order_id}</span>
                                </div>
                                {selectedPayment.method && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Method:</span>
                                    <span className="capitalize">{selectedPayment.method}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => fetchPayments(page - 1)}
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
                      onClick={() => fetchPayments(pageNum)}
                      disabled={loading}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                onClick={() => fetchPayments(page + 1)}
                disabled={page >= totalPages || loading}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BuyerPayments;