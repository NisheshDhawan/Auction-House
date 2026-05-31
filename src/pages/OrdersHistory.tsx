import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useToast } from '@/hooks/use-toast';
import { ordersAPI, Order } from '@/services/ordersAPI';
import { ImageDisplay } from '@/components/ui/image-display';
import { RupeeIcon } from '@/components/ui/rupee-icon';
import { 
  Package, 
  Calendar, 
  ShoppingBag,
  User,
  Search,
  CheckCircle,
  Gavel
} from 'lucide-react';

const OrdersHistory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch seller's orders
  useEffect(() => {
    const fetchOrders = async () => {
      console.log('🔍 OrdersHistory: Starting to fetch orders...');
      console.log('🔍 OrdersHistory: User ID:', user?.id);
      
      if (!user?.id) {
        console.log('❌ OrdersHistory: No user ID, returning early');
        return;
      }
      
      try {
        console.log('🔍 OrdersHistory: Setting loading to true');
        setIsLoading(true);
        
        console.log('🔍 OrdersHistory: Calling populateRealOrdersData...');
        // First, try to populate real orders data
        await ordersAPI.populateRealOrdersData(user.id);
        console.log('✅ OrdersHistory: populateRealOrdersData completed');
        
        console.log('🔍 OrdersHistory: Calling getSellerOrders...');
        // Then fetch the orders
        const response = await ordersAPI.getSellerOrders(user.id);
        console.log('✅ OrdersHistory: getSellerOrders response:', response);
        
        setOrders(response.orders);
        console.log('✅ OrdersHistory: Orders set, count:', response.orders.length);
      } catch (error: any) {
        console.error('❌ OrdersHistory: Error loading orders:', error);
        toast({
          title: "Error loading orders",
          description: error.message || "Failed to load your order history",
          variant: "destructive",
        });
        setOrders([]);
      } finally {
        console.log('🔍 OrdersHistory: Setting loading to false');
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [user?.id, toast]);

  // Filter orders based on search
  const filteredOrders = orders.filter(order =>
    order.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.buyerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stats
  const stats = {
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, order) => sum + order.finalPrice, 0),
    averageOrderValue: orders.length > 0 ? orders.reduce((sum, order) => sum + order.finalPrice, 0) / orders.length : 0,
    uniqueCustomers: new Set(orders.map(order => order.buyerId)).size
  };

  if (isLoading) {
    return <LoadingScreen title="Loading Orders" description="Fetching your order history..." />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Orders History</h1>
            <p className="text-muted-foreground mt-2">
              Track all your completed sales and customer orders
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (user?.id) {
                  setIsLoading(true);
                  try {
                    await ordersAPI.populateRealOrdersData(user.id);
                    const response = await ordersAPI.getSellerOrders(user.id);
                    setOrders(response.orders);
                    toast({
                      title: "Data refreshed",
                      description: "Order history has been updated with real auction data",
                    });
                  } catch (error: any) {
                    toast({
                      title: "Error refreshing data",
                      description: error.message || "Failed to refresh order data",
                      variant: "destructive",
                    });
                  } finally {
                    setIsLoading(false);
                  }
                }
              }}
              className="gap-2"
            >
              <Search className="h-4 w-4" />
              Refresh Orders
            </Button>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{stats.totalOrders} Total Orders</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalOrders}</div>
              <div className="text-sm text-muted-foreground">Total Orders</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                ₹{stats.totalRevenue.toLocaleString('en-IN')}
              </div>
              <div className="text-sm text-muted-foreground">Total Revenue</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                ₹{Math.round(stats.averageOrderValue).toLocaleString('en-IN')}
              </div>
              <div className="text-sm text-muted-foreground">Avg Order Value</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.uniqueCustomers}</div>
              <div className="text-sm text-muted-foreground">Unique Customers</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders by product or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Orders List */}
        {filteredOrders.length > 0 ? (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="glass-card hover-tilt">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Product Image */}
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 overflow-hidden flex-shrink-0">
                      <ImageDisplay
                        imageId={order.productImage}
                        alt={order.productName}
                        className="w-full h-full object-cover rounded-lg"
                        fallbackClassName="w-full h-full flex items-center justify-center"
                        showLoader={false}
                      />
                    </div>

                    {/* Order Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold">{order.productName}</h3>
                          <p className="text-sm text-muted-foreground">
                            Order #{order.id.slice(-8).toUpperCase()}
                          </p>
                        </div>
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          COMPLETED
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        {/* Customer Info */}
                        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-700">Customer</span>
                          </div>
                          <div className="text-sm font-semibold">{order.buyerName}</div>
                          {order.buyerEmail && (
                            <div className="text-xs text-muted-foreground">{order.buyerEmail}</div>
                          )}
                        </div>

                        {/* Final Price */}
                        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                          <div className="flex items-center gap-2 mb-1">
                            <RupeeIcon className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700">Final Price</span>
                          </div>
                          <div className="text-lg font-bold text-green-700">
                            ₹{order.finalPrice.toLocaleString('en-IN')}
                          </div>
                        </div>

                        {/* Auction Info */}
                        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                          <div className="flex items-center gap-2 mb-1">
                            <Gavel className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium text-primary">Auction</span>
                          </div>
                          <div className="text-sm font-semibold">{order.totalBids} bids</div>
                          <div className="text-xs text-muted-foreground">
                            Category: {order.category}
                          </div>
                        </div>

                        {/* Order Date */}
                        <div className="p-3 rounded-lg bg-background/50 border">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Order Date</span>
                          </div>
                          <div className="text-sm font-semibold">
                            {new Date(order.orderDate).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(order.orderDate).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>

                      {/* Success Message */}
                      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            Successfully sold to {order.buyerName} via auction
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Orders Yet</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm 
                ? 'No orders match your search criteria'
                : 'You haven\'t sold any items yet. Create listings to start selling!'
              }
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default OrdersHistory;