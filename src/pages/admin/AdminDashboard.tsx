import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Package, 
  ShoppingBag, 
  ShoppingCart, 
  TrendingUp, 
  DollarSign,
  Activity,
  Clock
} from 'lucide-react';
import { getDashboardStats, getDashboardActivities, testAuth, testSimple, type AdminStats, type AdminActivity } from '@/services/adminAPI';
import { useToast } from '@/hooks/use-toast';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalProducts: 0,
    activeListings: 0,
    totalOrders: 0,
    revenue: 0,
    pendingRequests: 0,
    totalCategories: 0
  });
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch real data from API
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch stats and activities in parallel for faster loading
        const [statsData, activitiesData] = await Promise.all([
          getDashboardStats().catch(err => {
            console.error('Stats fetch failed:', err);
            return {
              totalUsers: 0,
              totalProducts: 0,
              activeListings: 0,
              totalOrders: 0,
              revenue: 0,
              pendingRequests: 0,
              totalCategories: 0
            };
          }),
          getDashboardActivities().catch(err => {
            console.error('Activities fetch failed:', err);
            return [];
          })
        ]);
        
        setStats(statsData);
        setActivities(activitiesData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        
        // Show more specific error messages
        let errorMessage = 'Failed to load dashboard data. Please try again.';
        if (error.message.includes('403')) {
          errorMessage = 'Access denied. Please ensure you have admin privileges.';
        } else if (error.message.includes('401')) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (error.message.includes('Network error')) {
          errorMessage = 'Network error. Please check your connection.';
        }
        
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [toast]);

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      description: '+12% from last month',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Total Products',
      value: stats.totalProducts.toLocaleString(),
      description: '+8% from last month',
      icon: Package,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Active Listings',
      value: stats.activeListings.toLocaleString(),
      description: '+23% from last month',
      icon: ShoppingBag,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders.toLocaleString(),
      description: '+15% from last month',
      icon: ShoppingCart,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Revenue',
      value: `₹${stats.revenue.toLocaleString('en-IN')}`,
      description: '+18% from last month',
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    {
      title: 'Pending Requests',
      value: stats.pendingRequests.toLocaleString(),
      description: 'Category requests',
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    }
  ];

  // Use real activities data from API

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registered':
        return <Users className="h-4 w-4" />;
      case 'product_listed':
        return <Package className="h-4 w-4" />;
      case 'order_completed':
        return <ShoppingCart className="h-4 w-4" />;
      case 'category_requested':
        return <Clock className="h-4 w-4" />;
      case 'bid_placed':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'info':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // Navigation handlers for quick actions
  const handleQuickAction = (action: string) => {
    // Show feedback toast
    const actionMessages = {
      users: 'Navigating to User Management...',
      products: 'Opening Product Management...',
      categories: 'Opening Category Management...',
      orders: 'Opening Order Management...',
      listings: 'Opening Listings Management...',
      bidding: 'Opening Bidding History...'
    };

    toast({
      title: 'Navigation',
      description: actionMessages[action] || 'Navigating...',
      duration: 1500,
    });

    // Navigate after a short delay for better UX
    setTimeout(() => {
      switch (action) {
        case 'users':
          navigate('/admin/users');
          break;
        case 'products':
          navigate('/admin/products');
          break;
        case 'categories':
          navigate('/admin/categories');
          break;
        case 'orders':
          navigate('/admin/orders');
          break;
        case 'listings':
          navigate('/admin/listings');
          break;
        case 'bidding':
          navigate('/admin/bidding-history');
          break;
        default:
          console.log(`Quick action: ${action}`);
      }
    }, 200);
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent, action: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleQuickAction(action);
    }
  };

  return (
    <div className="space-y-8 mt-20">
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-serif font-bold gradient-text mb-2">Welcome back, Admin!</h2>
        <p className="text-muted-foreground">
          Here's what's happening with your auction house today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="glass-card hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <>
                    <div className="h-8 bg-muted rounded animate-pulse mb-1"></div>
                    <div className="h-3 bg-muted rounded w-2/3 animate-pulse"></div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-foreground mb-1">
                      {stat.value}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {stat.description}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Activity className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest activities across your platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-muted rounded-full animate-pulse"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded animate-pulse"></div>
                        <div className="h-3 bg-muted rounded w-1/3 animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : activities.length > 0 ? (
                activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${getStatusColor(activity.status)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {activity.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No recent activities</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Navigate to common administrative tasks with one click
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => handleQuickAction('users')}
                onKeyDown={(e) => handleKeyDown(e, 'users')}
                aria-label="Navigate to User Management"
                className="flex items-center gap-3 p-3 text-left rounded-lg border border-border hover:bg-primary/5 hover:border-primary/20 transition-all duration-200 hover:shadow-md hover:scale-[1.02] group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground group-hover:text-primary transition-colors">Manage Users</p>
                  <p className="text-xs text-muted-foreground">View and manage user accounts</p>
                </div>
              </button>
              
              <button 
                onClick={() => handleQuickAction('products')}
                onKeyDown={(e) => handleKeyDown(e, 'products')}
                aria-label="Navigate to Product Management"
                className="flex items-center gap-3 p-3 text-left rounded-lg border border-border hover:bg-green-50 hover:border-green-200 transition-all duration-200 hover:shadow-md hover:scale-[1.02] group focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                  <Package className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground group-hover:text-green-700 transition-colors">Review Products</p>
                  <p className="text-xs text-muted-foreground">Approve pending product listings</p>
                </div>
              </button>
              
              <button 
                onClick={() => handleQuickAction('categories')}
                onKeyDown={(e) => handleKeyDown(e, 'categories')}
                aria-label="Navigate to Category Management"
                className="flex items-center gap-3 p-3 text-left rounded-lg border border-border hover:bg-yellow-50 hover:border-yellow-200 transition-all duration-200 hover:shadow-md hover:scale-[1.02] group focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
              >
                <div className="p-2 bg-yellow-100 rounded-lg group-hover:bg-yellow-200 transition-colors">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground group-hover:text-yellow-700 transition-colors">Category Requests</p>
                    {stats.pendingRequests > 0 && (
                      <Badge variant="destructive" className="text-xs animate-pulse">
                        {stats.pendingRequests}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Review pending category requests</p>
                </div>
              </button>
              
              <button 
                onClick={() => handleQuickAction('orders')}
                onKeyDown={(e) => handleKeyDown(e, 'orders')}
                aria-label="Navigate to Order Management"
                className="flex items-center gap-3 p-3 text-left rounded-lg border border-border hover:bg-blue-50 hover:border-blue-200 transition-all duration-200 hover:shadow-md hover:scale-[1.02] group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <ShoppingCart className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground group-hover:text-blue-700 transition-colors">Order Management</p>
                  <p className="text-xs text-muted-foreground">Track and manage orders</p>
                </div>
              </button>

              <button 
                onClick={() => handleQuickAction('listings')}
                onKeyDown={(e) => handleKeyDown(e, 'listings')}
                aria-label="Navigate to Listings Management"
                className="flex items-center gap-3 p-3 text-left rounded-lg border border-border hover:bg-purple-50 hover:border-purple-200 transition-all duration-200 hover:shadow-md hover:scale-[1.02] group focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <ShoppingBag className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground group-hover:text-purple-700 transition-colors">Manage Listings</p>
                  <p className="text-xs text-muted-foreground">View and manage auction listings</p>
                </div>
              </button>

              <button 
                onClick={() => handleQuickAction('bidding')}
                onKeyDown={(e) => handleKeyDown(e, 'bidding')}
                aria-label="Navigate to Bidding History"
                className="flex items-center gap-3 p-3 text-left rounded-lg border border-border hover:bg-emerald-50 hover:border-emerald-200 transition-all duration-200 hover:shadow-md hover:scale-[1.02] group focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                <div className="p-2 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground group-hover:text-emerald-700 transition-colors">Bidding History</p>
                  <p className="text-xs text-muted-foreground">Monitor all bidding activity</p>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Activity className="h-5 w-5 text-primary" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-primary rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-foreground">Database</p>
                <p className="text-xs text-muted-foreground">Operational</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-primary rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-foreground">API Server</p>
                <p className="text-xs text-muted-foreground">Operational</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-primary rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-foreground">Email Service</p>
                <p className="text-xs text-muted-foreground">Operational</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-foreground">File Storage</p>
                <p className="text-xs text-muted-foreground">Degraded</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;