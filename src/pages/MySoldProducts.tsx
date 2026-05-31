import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useToast } from '@/hooks/use-toast';
import { soldProductsAPI, type SoldProduct, type OwnershipRecord } from '../services/soldProductsAPI';
import OwnershipTimeline from '@/components/sold-products/OwnershipTimeline';
import SalesMetrics from '@/components/sold-products/SalesMetrics';
import { 
  RefreshCw,
  Package,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  Eye,
  History,
  ArrowRight,
  Crown,
  ShoppingCart,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Gavel,
  X
} from 'lucide-react';

const MySoldProducts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [soldProducts, setSoldProducts] = useState<SoldProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<SoldProduct | null>(null);
  const [showOwnershipHistory, setShowOwnershipHistory] = useState(false);
  const [stats, setStats] = useState({
    totalProductsSold: 0,
    totalRevenue: 0,
    totalProfit: 0,
    averageSalePrice: 0,
    mostProfitableProduct: null as SoldProduct | null,
    bestPerformingCategory: '',
    totalResales: 0
  });

  // Fetch sold products data
  const fetchSoldProducts = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      console.log('🔍 MySoldProducts: Fetching sold products for seller:', user.id);
      
      const response = await soldProductsAPI.getSoldProducts(user.id);
      console.log('📦 Sold products response:', response);
      
      setSoldProducts(response.soldProducts || []);
      
      // Calculate statistics
      const products = response.soldProducts || [];
      const totalRevenue = products.reduce((sum, p) => sum + p.currentValue, 0);
      const totalProfit = products.reduce((sum, p) => sum + p.totalProfit, 0);
      const totalResales = products.reduce((sum, p) => sum + p.timesResold, 0);
      
      const mostProfitableProduct = products.reduce((max, p) => 
        p.totalProfit > (max?.totalProfit || 0) ? p : max, null as SoldProduct | null
      );
      
      // Find best performing category
      const categoryStats = products.reduce((acc, p) => {
        acc[p.category] = (acc[p.category] || 0) + p.totalProfit;
        return acc;
      }, {} as Record<string, number>);
      
      const bestPerformingCategory = Object.entries(categoryStats)
        .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || '';
      
      setStats({
        totalProductsSold: products.length,
        totalRevenue,
        totalProfit,
        averageSalePrice: products.length > 0 ? totalRevenue / products.length : 0,
        mostProfitableProduct,
        bestPerformingCategory,
        totalResales
      });
      
      console.log('✅ MySoldProducts: Data loaded successfully');
      
    } catch (error) {
      console.error('💥 MySoldProducts: Error fetching sold products:', error);
      toast({
        title: "Error loading sold products",
        description: "Could not fetch your sold products data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchSoldProducts();
      toast({
        title: "Data Refreshed",
        description: "Sold products data updated successfully",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Could not update sold products data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // View ownership history
  const viewOwnershipHistory = (product: SoldProduct) => {
    setSelectedProduct(product);
    setShowOwnershipHistory(true);
  };

  // Load data on component mount
  useEffect(() => {
    fetchSoldProducts();
  }, [user?.id]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case 'sold':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Sold</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get payment status badge
  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return <LoadingScreen title="Loading Sold Products" description="Fetching your sales history..." />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">My Sold Products</h1>
            <p className="text-muted-foreground mt-2">
              Track ownership history and performance of your sold items
            </p>
          </div>
          
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Products Sold</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.totalProductsSold}
                  </p>
                </div>
                <Package className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats.totalRevenue)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Profit</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(stats.totalProfit)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Resales</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.totalResales}
                  </p>
                </div>
                <Users className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sold Products List */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Sold Products History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {soldProducts.length > 0 ? (
              <div className="space-y-4">
                {soldProducts.map((product) => (
                  <div key={product.id} className="border rounded-lg p-4 bg-background/50">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        {/* Product Image */}
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                          {product.productImage ? (
                            <img 
                              src={product.productImage} 
                              alt={product.productName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                        
                        {/* Product Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{product.productName}</h3>
                            {getStatusBadge(product.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {product.productDescription}
                          </p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              First sold: {formatDate(product.firstSaleDate)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {product.timesResold} resales
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-4 h-4" />
                              {formatCurrency(product.totalProfit)} profit
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewOwnershipHistory(product)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View History
                        </Button>
                      </div>
                    </div>
                    
                    {/* Quick Stats */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Original Price:</span>
                          <div className="font-medium">{formatCurrency(product.originalBasePrice)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Current Value:</span>
                          <div className="font-medium">{formatCurrency(product.currentValue)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Highest Sale:</span>
                          <div className="font-medium">{formatCurrency(product.salesMetrics.highestSalePrice)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Current Owner:</span>
                          <div className="font-medium flex items-center gap-1">
                            <Crown className="w-3 h-3 text-yellow-500" />
                            {product.currentOwner.name}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Sold Products Yet</h3>
                <p className="text-muted-foreground">
                  Your sold products will appear here once buyers complete their purchases.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ownership History Modal */}
        {showOwnershipHistory && selectedProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden bg-background rounded-lg shadow-xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  {selectedProduct.productName} - Complete History
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowOwnershipHistory(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] space-y-6">
                {/* Product Summary */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Original Price</span>
                      <div className="text-lg font-semibold">
                        {formatCurrency(selectedProduct.originalBasePrice)}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Current Value</span>
                      <div className="text-lg font-semibold text-blue-600">
                        {formatCurrency(selectedProduct.currentValue)}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Total Profit</span>
                      <div className="text-lg font-semibold text-green-600">
                        {formatCurrency(selectedProduct.totalProfit)}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Times Resold</span>
                      <div className="text-lg font-semibold text-purple-600">
                        {selectedProduct.timesResold}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sales Metrics */}
                <div>
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Sales Performance Metrics
                  </h3>
                  <SalesMetrics
                    metrics={selectedProduct.salesMetrics}
                    originalPrice={selectedProduct.originalBasePrice}
                    totalSales={selectedProduct.totalSales}
                    totalProfit={selectedProduct.totalProfit}
                  />
                </div>

                {/* Ownership Timeline */}
                <OwnershipTimeline
                  ownershipHistory={selectedProduct.ownershipHistory}
                  productName={selectedProduct.productName}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MySoldProducts;