import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { customersAPI, Customer } from '@/services/customersAPI';
import { 
  Users, 
  Calendar, 
  ShoppingBag,
  User,
  Search,
  TrendingUp,
  Heart,
  Eye,
  Package
} from 'lucide-react';

const Customers = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerStats, setCustomerStats] = useState({
    totalCustomers: 0,
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isProductsDialogOpen, setIsProductsDialogOpen] = useState(false);
  const [customerProducts, setCustomerProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Fetch seller's customers and stats
  useEffect(() => {
    const fetchCustomersAndStats = async () => {
      if (!user?.id) return;
      
      try {
        setIsLoading(true);
        
        // Clear any cached data first to ensure we only show database data
        customersAPI.clearLocalStorage();
        
        // Fetch both customers and stats in parallel
        const [customersResponse, statsResponse] = await Promise.all([
          customersAPI.getSellerCustomers(user.id),
          customersAPI.getCustomerStats(user.id)
        ]);
        
        setCustomers(customersResponse.customers);
        setCustomerStats(statsResponse);
        
        console.log('Fetched customers from database:', customersResponse.customers.length);
        console.log('Fetched customer stats:', statsResponse);
        
      } catch (error: any) {
        console.error('Error fetching customers:', error);
        
        // Show user-friendly error message
        toast({
          title: "Database Connection Issue",
          description: "Unable to connect to database. Please check your connection and try again.",
          variant: "destructive",
        });
        
        // Set empty customers array - no local storage fallback
        setCustomers([]);
        setCustomerStats({
          totalCustomers: 0,
          totalRevenue: 0,
          totalOrders: 0,
          averageOrderValue: 0
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomersAndStats();
  }, [user?.id, toast]);

  // Fetch customer's purchased products
  const fetchCustomerProducts = async (customer: Customer) => {
    setIsLoadingProducts(true);
    setSelectedCustomer(customer);
    setIsProductsDialogOpen(true);
    
    try {
      console.log('Fetching products for customer:', customer.customerId);
      
      if (!user?.id) {
        throw new Error('User ID not available');
      }
      
      // Use the API method
      const response = await customersAPI.getCustomerProducts(user.id, customer.customerId);
      setCustomerProducts(response.products);
      
      console.log('Successfully fetched customer products:', response.products.length);
      
    } catch (error: any) {
      console.error('Error fetching customer products:', error);
      
      toast({
        title: "Error loading products",
        description: error.message || "Failed to load customer's purchased products",
        variant: "destructive",
      });
      setCustomerProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Filter customers based on search
  const filteredCustomers = customers.filter(customer =>
    customer.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.customerEmail && customer.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (customer.favoriteCategory && customer.favoriteCategory.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calculate stats from both API and local data for verification
  const localStats = {
    totalCustomers: customers.length,
    totalRevenue: customers.reduce((sum, customer) => sum + customer.totalSpent, 0),
    totalOrders: customers.reduce((sum, customer) => sum + customer.totalOrders, 0)
  };

  // Use API stats if available, otherwise fall back to calculated stats
  const displayStats = {
    totalCustomers: customerStats.totalCustomers || localStats.totalCustomers,
    totalRevenue: customerStats.totalRevenue || localStats.totalRevenue,
    totalOrders: customerStats.totalOrders || localStats.totalOrders,
    averageOrderValue: customerStats.averageOrderValue || (localStats.totalOrders > 0 ? localStats.totalRevenue / localStats.totalOrders : 0)
  };

  console.log('📊 Customer Stats Comparison:', {
    apiStats: customerStats,
    localStats: localStats,
    displayStats: displayStats,
    customersCount: customers.length,
    customersData: customers.map(c => ({ name: c.customerName, spent: c.totalSpent, orders: c.totalOrders }))
  });

  // Sort customers by total spent (top customers first)
  const sortedCustomers = [...filteredCustomers].sort((a, b) => b.totalSpent - a.totalSpent);

  if (isLoading) {
    return <LoadingScreen title="Loading Customers" description="Fetching your customer data..." />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Customers</h1>
            <p className="text-muted-foreground mt-2">
              Manage your customer relationships and track their purchase history
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{displayStats.totalCustomers} Total Customers</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{displayStats.totalCustomers}</div>
              <div className="text-sm text-muted-foreground">Total Customers</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                ₹{displayStats.totalRevenue.toLocaleString('en-IN')}
              </div>
              <div className="text-sm text-muted-foreground">Total Revenue</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{displayStats.totalOrders}</div>
              <div className="text-sm text-muted-foreground">Total Orders</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                ₹{Math.round(displayStats.averageOrderValue).toLocaleString('en-IN')}
              </div>
              <div className="text-sm text-muted-foreground">Avg Order Value</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers by name, email, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Customers List */}
        {sortedCustomers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedCustomers.map((customer, index) => (
              <Card key={customer.id} className="glass-card hover-tilt">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{customer.customerName}</CardTitle>
                        {customer.customerEmail && (
                          <CardDescription className="text-sm">
                            {customer.customerEmail}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    {index < 3 && (
                      <Badge variant="default" className="bg-yellow-500">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        TOP {index + 1}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Customer Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                      <div className="text-lg font-bold text-green-700">
                        ₹{customer.totalSpent.toLocaleString('en-IN')}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Spent</div>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                      <div className="text-lg font-bold text-blue-700">{customer.totalOrders}</div>
                      <div className="text-xs text-muted-foreground">Orders</div>
                    </div>
                  </div>

                  {/* Customer Details */}
                  <div className="space-y-3">
                    {customer.favoriteCategory && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Favorite Category:</span>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {customer.favoriteCategory}
                        </Badge>
                      </div>
                    )}

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>First purchase: {new Date(customer.firstPurchaseDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Last purchase: {new Date(customer.lastPurchaseDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Customer Value Indicator */}
                  <div className={`p-3 rounded-lg border ${
                    customer.totalSpent >= 50000 
                      ? 'bg-yellow-500/10 border-yellow-500/20' 
                      : customer.totalSpent >= 20000
                      ? 'bg-green-500/10 border-green-500/20'
                      : 'bg-blue-500/10 border-blue-500/20'
                  }`}>
                    <div className={`flex items-center gap-2 ${
                      customer.totalSpent >= 50000 
                        ? 'text-yellow-700' 
                        : customer.totalSpent >= 20000
                        ? 'text-green-700'
                        : 'text-blue-700'
                    }`}>
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {customer.totalSpent >= 50000 
                          ? 'VIP Customer' 
                          : customer.totalSpent >= 20000
                          ? 'Valued Customer'
                          : 'Regular Customer'
                        }
                      </span>
                    </div>
                  </div>

                  {/* View Products Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchCustomerProducts(customer)}
                    className="w-full gap-2 hover:bg-primary/5"
                  >
                    <Eye className="h-4 w-4" />
                    View Purchased Products ({customer.totalOrders})
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Customers Yet</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm 
                ? 'No customers match your search criteria'
                : 'You haven\'t had any customers yet. Start selling items to build your customer base!'
              }
            </p>
            
            {/* Database Setup Notice */}
            <Card className="max-w-2xl mx-auto mt-6 glass-card border-blue-200 bg-blue-50/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-semibold text-blue-900 mb-2">Database Setup Required</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      To track real customer data from completed auctions, please set up the customers table in your Supabase database.
                    </p>
                    <div className="text-xs text-blue-600 space-y-1">
                      <p>1. Go to Supabase Dashboard → SQL Editor</p>
                      <p>2. Run the SQL from: <code className="bg-blue-100 px-1 rounded">supabase-customers-setup.sql</code></p>
                      <p>3. Refresh this page to see real customer data</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Products Dialog */}
      <Dialog open={isProductsDialogOpen} onOpenChange={setIsProductsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Products Purchased by {selectedCustomer?.customerName}
            </DialogTitle>
            <DialogDescription>
              View all products purchased by this customer through your auctions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isLoadingProducts ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2 text-muted-foreground">Loading products...</span>
              </div>
            ) : customerProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customerProducts.map((product, index) => (
                  <Card key={product.id} className="glass-card">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                          <Package className="h-8 w-8 text-primary" />
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-lg">{product.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {product.category}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-green-600">
                                ₹{product.purchasePrice.toLocaleString('en-IN')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Purchase Price
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>
                                Purchased: {new Date(product.purchaseDate).toLocaleDateString('en-IN', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <ShoppingBag className="h-4 w-4" />
                              <span>Auction ID: {product.auctionId.slice(0, 8)}...</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-border/50">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                Product #{index + 1} of {customerProducts.length}
                              </span>
                              <Badge 
                                variant="default" 
                                className="bg-green-500/10 text-green-700 border-green-500/20"
                              >
                                Completed
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Products Found</h3>
                <p className="text-muted-foreground">
                  This customer hasn't purchased any products yet.
                </p>
              </div>
            )}

            {/* Summary */}
            {customerProducts.length > 0 && (
              <Card className="glass-card bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Purchase Summary</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">
                        ₹{customerProducts.reduce((sum, product) => sum + product.purchasePrice, 0).toLocaleString('en-IN')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total from {customerProducts.length} product{customerProducts.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Customers;