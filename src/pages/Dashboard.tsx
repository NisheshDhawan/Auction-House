import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useToast } from '@/hooks/use-toast';
import { purchasesAPI, Purchase } from '@/services/purchasesAPI';
import { bidHistoryAPI, BidHistory } from '@/services/bidHistoryAPI';
import { listingsAPI } from '@/services/listingsAPI';
import { productsAPI } from '@/services/productsAPI';
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  Gavel,
  Trophy,
  Clock,
  Calendar,
  User
} from 'lucide-react';
import { RupeeIcon } from '@/components/ui/rupee-icon';

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Get profile type from localStorage or default to buyer
  const savedProfile = localStorage.getItem('userProfile');
  const profileType = savedProfile ? JSON.parse(savedProfile).profileType : 'buyer';

  // State for buyer data
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [bidHistory, setBidHistory] = useState<BidHistory[]>([]);
  const [activeAuctions, setActiveAuctions] = useState(0);
  
  // State for seller data
  const [sellerProducts, setSellerProducts] = useState<any[]>([]);
  const [sellerListings, setSellerListings] = useState<any[]>([]);
  const [sellerActivity, setSellerActivity] = useState<any[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  
  const [isLoading, setIsLoading] = useState(true);

  // Fallback timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('Dashboard loading timeout - forcing completion');
        setIsLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [isLoading]);

  // Fetch dashboard data based on profile type
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        if (!user?.id) {
          setIsLoading(false);
          return;
        }

        if (profileType === 'buyer') {
          // Fetch buyer data
          try {
            const purchasesResponse = await purchasesAPI.getUserPurchases(user.id);
            setPurchases(purchasesResponse?.purchases || []);
          } catch (error) {
            console.warn('Failed to fetch purchases:', error);
            setPurchases([]);
          }

          try {
            const bidHistoryResponse = await bidHistoryAPI.getUserBidHistory(user.id);
            setBidHistory(bidHistoryResponse?.bids || []);
          } catch (error) {
            console.warn('Failed to fetch bid history:', error);
            setBidHistory([]);
          }

          try {
            const listingsResponse = await listingsAPI.getListings({ status: 'active' });
            // Exclude user's own listings since they cannot bid on them
            const validAuctions = listingsResponse?.listings?.filter(l => l.sellerId !== user.id) || [];
            setActiveAuctions(validAuctions.length);
          } catch (error) {
            console.warn('Failed to fetch active auctions:', error);
            setActiveAuctions(0);
          }
        } else if (profileType === 'seller') {
          // Fetch seller data
          try {
            const productsResponse = await productsAPI.getSellerProducts(user?.id || '');
            setSellerProducts(productsResponse?.products || []);
          } catch (error) {
            console.warn('Failed to fetch products:', error);
            setSellerProducts([]);
          }

          try {
            const listingsResponse = await listingsAPI.getSellerListings(user?.id || '');
            setSellerListings(listingsResponse?.listings || []);
          } catch (error) {
            console.warn('Failed to fetch listings:', error);
            setSellerListings([]);
          }

          // Fetch dashboard metrics from backend
          try {
            const token = localStorage.getItem('auth_token');
            const metricsResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/listings/dashboard/${user?.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (metricsResponse.ok) {
              const metrics = await metricsResponse.json();
              console.log('Dashboard metrics from backend:', metrics);
              setDashboardMetrics(metrics);
            }
          } catch (error) {
            console.warn('Failed to fetch dashboard metrics:', error);
          }

          // Fetch comprehensive activity data from new API
          try {
            const token = localStorage.getItem('auth_token');
            const activityResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/dashboard/seller/${user?.id}/activity?limit=20`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (activityResponse.ok) {
              const activityData = await activityResponse.json();
              console.log('🎯 Comprehensive activity data:', activityData);
              
              if (activityData.success && activityData.activities) {
                setSellerActivity(activityData.activities);
                console.log('✅ Activity data loaded successfully:', activityData.activities.length, 'activities');
                console.log('📊 Activity breakdown:', activityData.debug);
              } else {
                console.warn('⚠️ No activities returned from API');
                setSellerActivity([]);
              }
            } else {
              const errorText = await activityResponse.text();
              console.warn('❌ Activity API failed:', activityResponse.status, errorText);
              setSellerActivity([]);
            }
          } catch (activityError) {
            console.warn('❌ Activity API error:', activityError);
            setSellerActivity([]);
          }
        }
        
      } catch (error: any) {
        console.error('Dashboard data fetch error:', error);
        toast({
          title: "Error loading dashboard",
          description: error.message || "Failed to load dashboard data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Add a small delay to prevent rapid re-renders
    const timeoutId = setTimeout(fetchDashboardData, 100);
    return () => clearTimeout(timeoutId);
  }, [user?.id, profileType, toast]);

  // Calculate buyer statistics with safety checks
  const buyerStats = {
    totalPurchases: purchases?.length || 0,
    totalSpent: purchases?.reduce((sum, p) => sum + (p.finalPrice || 0), 0) || 0,
    totalBids: bidHistory?.length || 0,
    productsBidOn: bidHistory ? [...new Set(bidHistory.map(b => b.productId))].length : 0, // Count unique products bid on
    wonAuctions: bidHistory?.filter(b => b.auctionStatus === 'won').length || 0,
    ongoingBids: bidHistory?.filter(b => b.auctionStatus === 'ongoing').length || 0,
    activeAuctions: activeAuctions || 0
  };

  // Calculate seller statistics with backend metrics or fallback to frontend data
  const sellerStats = dashboardMetrics ? {
    totalProducts: dashboardMetrics.totalProducts,
    totalListings: dashboardMetrics.totalListings,
    activeListings: dashboardMetrics.activeAuctions,
    soldItems: dashboardMetrics.itemsSold,
    totalRevenue: dashboardMetrics.totalRevenue,
    availableToList: dashboardMetrics.availableToList
  } : {
    totalProducts: sellerProducts?.length || 0,
    totalListings: sellerListings?.length || 0,
    activeListings: sellerListings?.filter(l => l.status === 'active').length || 0,
    soldItems: sellerListings?.filter(l => l.status === 'sold').length || 0,
    totalRevenue: sellerListings?.filter(l => l.status === 'sold').reduce((sum, l) => sum + (l.currentBid || 0), 0) || 0,
    availableToList: 0
  };

  // Get recent activity from bid history and purchases with safety checks
  const getRecentActivity = () => {
    const activities: Array<{
      id: string;
      type: 'bid' | 'purchase';
      message: string;
      timestamp: string;
      amount?: number;
    }> = [];

    try {
      // Add recent bids with safety checks
      if (bidHistory && Array.isArray(bidHistory)) {
        bidHistory.slice(0, 5).forEach(bid => {
          if (bid && bid.id && bid.bidAmount && bid.productName && bid.bidDate) {
            activities.push({
              id: `bid-${bid.id}`,
              type: 'bid',
              message: `Placed bid of ₹${bid.bidAmount.toLocaleString('en-IN')} on ${bid.productName}`,
              timestamp: bid.bidDate,
              amount: bid.bidAmount
            });
          }
        });
      }

      // Add recent purchases with safety checks
      if (purchases && Array.isArray(purchases)) {
        purchases.slice(0, 3).forEach(purchase => {
          if (purchase && purchase.id && purchase.finalPrice && purchase.productName && purchase.purchaseDate) {
            activities.push({
              id: `purchase-${purchase.id}`,
              type: 'purchase',
              message: `Won ${purchase.productName} for ₹${purchase.finalPrice.toLocaleString('en-IN')}`,
              timestamp: purchase.purchaseDate,
              amount: purchase.finalPrice
            });
          }
        });
      }

      // Sort by timestamp and return latest 8
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 8);
    } catch (error) {
      console.error('Error generating recent activity:', error);
      return [];
    }
  };

  // Get comprehensive seller recent activity from all sources
  const getSellerRecentActivity = () => {
    const activities: Array<{
      id: string;
      type: 'listing' | 'sale' | 'bid' | 'product' | 'payment' | 'ownership' | 'customer';
      message: string;
      timestamp: string;
      amount?: number;
      icon?: string;
    }> = [];

    try {
      // 1. Add product activities
      if (sellerProducts && Array.isArray(sellerProducts)) {
        sellerProducts
          .filter(product => product && product.id && product.name)
          .slice(0, 5)
          .forEach(product => {
            activities.push({
              id: `product-${product.id}`,
              type: 'product',
              message: `Added ${product.name} to inventory`,
              timestamp: product.createdAt || new Date().toISOString(),
              amount: product.basePrice,
              icon: 'package'
            });

            // Add product status changes
            if (product.status === 'inactive') {
              activities.push({
                id: `product-inactive-${product.id}`,
                type: 'product',
                message: `Deactivated ${product.name}`,
                timestamp: product.updatedAt || product.createdAt || new Date().toISOString(),
                icon: 'pause'
              });
            }
          });
      }

      // 2. Add listing activities
      if (sellerListings && Array.isArray(sellerListings)) {
        sellerListings
          .filter(listing => listing && listing.id && listing.productName)
          .slice(0, 8)
          .forEach(listing => {
            // Add listing creation
            activities.push({
              id: `listing-${listing.id}`,
              type: 'listing',
              message: `Listed ${listing.productName} for auction`,
              timestamp: listing.createdAt || new Date().toISOString(),
              amount: listing.basePrice,
              icon: 'gavel'
            });

            // Add sale if sold
            if (listing.status === 'sold') {
              activities.push({
                id: `sale-${listing.id}`,
                type: 'sale',
                message: `Sold ${listing.productName} for ₹${listing.currentBid?.toLocaleString('en-IN')}`,
                timestamp: listing.updatedAt || listing.createdAt || new Date().toISOString(),
                amount: listing.currentBid,
                icon: 'check-circle'
              });

              // Add ownership transfer activity
              activities.push({
                id: `ownership-${listing.id}`,
                type: 'ownership',
                message: `Ownership of ${listing.productName} transferred to buyer`,
                timestamp: listing.updatedAt || listing.createdAt || new Date().toISOString(),
                icon: 'arrow-right'
              });
            }

            // Add bid activity for active auctions
            if (listing.status === 'active' && listing.totalBids > 0) {
              activities.push({
                id: `bid-${listing.id}`,
                type: 'bid',
                message: `New bid received on ${listing.productName} - ₹${listing.currentBid?.toLocaleString('en-IN')}`,
                timestamp: listing.updatedAt || listing.createdAt || new Date().toISOString(),
                amount: listing.currentBid,
                icon: 'trending-up'
              });
            }

            // Add listing ended activity
            if (listing.status === 'ended') {
              activities.push({
                id: `ended-${listing.id}`,
                type: 'listing',
                message: `Auction ended for ${listing.productName}`,
                timestamp: listing.endTime || listing.updatedAt || new Date().toISOString(),
                amount: listing.currentBid,
                icon: 'clock'
              });
            }
          });
      }

      // Sort by timestamp and return latest 10
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
    } catch (error) {
      console.error('Error generating seller recent activity:', error);
      return [];
    }
  };

  if (isLoading) {
    return <LoadingScreen title="Loading Dashboard" description="Fetching your dashboard data..." />;
  }

  // Show seller dashboard if seller profile
  if (profileType === 'seller') {
    // Use fetched activity data or fallback to local generation
    const displayActivity = sellerActivity.length > 0 ? sellerActivity : getSellerRecentActivity();

    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gradient-text">
                Welcome back, {user?.fullName}!
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage your store and track your sales performance
              </p>
            </div>
            <Badge variant="outline" className="border-primary text-primary px-4 py-2">
              🏪 Seller Mode
            </Badge>
          </div>

          {/* Seller Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-card p-6 hover-tilt">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Products</p>
                  <p className="text-2xl font-bold mt-1">{sellerStats.totalProducts}</p>
                  <p className="text-xs text-blue-600 mt-1">
                    {sellerStats.totalListings} listed
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="glass-card p-6 hover-tilt">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Auctions</p>
                  <p className="text-2xl font-bold mt-1">{sellerStats.activeListings}</p>
                  <p className="text-xs text-green-600 mt-1">
                    {sellerStats.totalListings - sellerStats.activeListings} scheduled
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="glass-card p-6 hover-tilt">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Items Sold</p>
                  <p className="text-2xl font-bold mt-1">{sellerStats.soldItems}</p>
                  <p className="text-xs text-primary mt-1">
                    {sellerStats.totalListings > 0 ? Math.round((sellerStats.soldItems / sellerStats.totalListings) * 100) : 0}% success rate
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-primary/10">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
              </div>
            </div>

            <div className="glass-card p-6 hover-tilt">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Available to List</p>
                  <p className="text-2xl font-bold mt-1">{sellerStats.availableToList}</p>
                  <p className="text-xs text-orange-600 mt-1">
                    Ready for auction
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-orange-500/10">
                  <Package className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass-card p-6">
            <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {displayActivity.length > 0 ? displayActivity.map((activity) => {
                // Get activity type styling
                const getActivityStyle = (type: string, subType?: string) => {
                  switch (type) {
                    case 'process':
                      switch (subType) {
                        case 'product_added':
                          return { bg: 'bg-blue-500', text: 'text-blue-700', bgLight: 'bg-blue-500/10' };
                        case 'product_listed':
                          return { bg: 'bg-purple-500', text: 'text-purple-700', bgLight: 'bg-purple-500/10' };
                        case 'auction_ended':
                          return { bg: 'bg-orange-500', text: 'text-orange-700', bgLight: 'bg-orange-500/10' };
                        case 'payment_completed':
                          return { bg: 'bg-green-500', text: 'text-green-700', bgLight: 'bg-green-500/10' };
                        case 'ownership_transferred':
                          return { bg: 'bg-indigo-500', text: 'text-indigo-700', bgLight: 'bg-indigo-500/10' };
                        default:
                          return { bg: 'bg-gray-500', text: 'text-gray-700', bgLight: 'bg-gray-500/10' };
                      }
                    case 'sale':
                      return { bg: 'bg-green-500', text: 'text-green-700', bgLight: 'bg-green-500/10' };
                    case 'payment':
                      return { bg: 'bg-emerald-500', text: 'text-emerald-700', bgLight: 'bg-emerald-500/10' };
                    case 'bid':
                      return { bg: 'bg-blue-500', text: 'text-blue-700', bgLight: 'bg-blue-500/10' };
                    case 'product':
                      return { bg: 'bg-purple-500', text: 'text-purple-700', bgLight: 'bg-purple-500/10' };
                    case 'ownership':
                      return { bg: 'bg-orange-500', text: 'text-orange-700', bgLight: 'bg-orange-500/10' };
                    case 'customer':
                      return { bg: 'bg-pink-500', text: 'text-pink-700', bgLight: 'bg-pink-500/10' };
                    case 'listing':
                    default:
                      return { bg: 'bg-primary', text: 'text-primary', bgLight: 'bg-primary/10' };
                  }
                };

                // Get activity icon based on type and subType
                const getActivityIcon = (type: string, subType?: string) => {
                  switch (type) {
                    case 'process':
                      switch (subType) {
                        case 'product_added':
                          return <Package className="h-4 w-4" />;
                        case 'product_listed':
                          return <Gavel className="h-4 w-4" />;
                        case 'auction_ended':
                          return <Clock className="h-4 w-4" />;
                        case 'payment_completed':
                          return <RupeeIcon className="h-4 w-4" />;
                        case 'ownership_transferred':
                          return <ShoppingCart className="h-4 w-4" />;
                        default:
                          return <Package className="h-4 w-4" />;
                      }
                    case 'product':
                      return subType === 'deactivated' ? <Package className="h-4 w-4" /> : <Package className="h-4 w-4" />;
                    case 'listing':
                      return subType === 'ended' ? <Clock className="h-4 w-4" /> : <Gavel className="h-4 w-4" />;
                    case 'sale':
                      return <Trophy className="h-4 w-4" />;
                    case 'payment':
                      return <RupeeIcon className="h-4 w-4" />;
                    case 'bid':
                      return <TrendingUp className="h-4 w-4" />;
                    case 'ownership':
                      return <ShoppingCart className="h-4 w-4" />;
                    case 'customer':
                      return <User className="h-4 w-4" />;
                    default:
                      return <Package className="h-4 w-4" />;
                  }
                };

                const style = getActivityStyle(activity.type, activity.subType);
                
                return (
                  <div key={activity.id} className="flex items-center space-x-3 p-4 rounded-lg bg-background/50 hover:bg-background/70 transition-colors border border-border/50">
                    <div className={`p-2 rounded-full ${style.bgLight}`}>
                      <div className={style.text}>
                        {getActivityIcon(activity.type, activity.subType)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{activity.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(activity.timestamp).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {activity.amount && (
                          <p className="text-xs text-green-600 font-medium">
                            ₹{activity.amount.toLocaleString('en-IN')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${style.bgLight} ${style.text} uppercase tracking-wide`}>
                      {activity.subType || activity.type}
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent activity</p>
                  <p className="text-sm">Start by adding products or creating listings</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Buyer dashboard with real data
  const recentActivity = getRecentActivity();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">
              Welcome back, {user?.fullName}!
            </h1>
            <p className="text-muted-foreground mt-2">
              Track your auction activity and manage your collection
            </p>
          </div>
          <Badge variant="outline" className="border-secondary text-secondary px-4 py-2">
            🛒 Buyer Mode
          </Badge>
        </div>

        {/* Real Buyer Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-card p-6 hover-tilt">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Items Won</p>
                <p className="text-2xl font-bold mt-1">{buyerStats.totalPurchases}</p>
                <p className="text-xs text-green-600 mt-1">
                  {buyerStats.wonAuctions} of {buyerStats.productsBidOn} products won
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10">
                <Trophy className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="glass-card p-6 hover-tilt">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold mt-1">₹{buyerStats.totalSpent.toLocaleString('en-IN')}</p>
                <p className="text-xs text-primary mt-1">
                  Avg: ₹{buyerStats.totalPurchases > 0 ? Math.round(buyerStats.totalSpent / buyerStats.totalPurchases).toLocaleString('en-IN') : '0'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <RupeeIcon className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="glass-card p-6 hover-tilt">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Products Bid On</p>
                <p className="text-2xl font-bold mt-1">{buyerStats.productsBidOn}</p>
                <p className="text-xs text-blue-600 mt-1">
                  {buyerStats.totalBids} total bids
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Gavel className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="glass-card p-6 hover-tilt">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Auctions</p>
                <p className="text-2xl font-bold mt-1">{buyerStats.activeAuctions}</p>
                <p className="text-xs text-orange-600 mt-1">Available to bid</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-500/10">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card p-6">
          <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.length > 0 ? recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-3 p-3 rounded-lg bg-background/50">
                <div className={`w-2 h-2 rounded-full ${
                  activity.type === 'purchase' ? 'bg-green-500' : 'bg-blue-500'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.message}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  activity.type === 'purchase' 
                    ? 'bg-green-500/10 text-green-700' 
                    : 'bg-blue-500/10 text-blue-700'
                }`}>
                  {activity.type === 'purchase' ? 'WON' : 'BID'}
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No recent activity</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Start bidding on auctions to see your activity here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;