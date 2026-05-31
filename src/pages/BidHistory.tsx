import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useToast } from '@/hooks/use-toast';
import { bidHistoryAPI, BidHistory } from '@/services/bidHistoryAPI';
import { ImageDisplay } from '@/components/ui/image-display';
import { 
  Package, 
  Calendar, 
  Gavel,
  Trophy,
  TrendingDown,
  Clock,
  Search
} from 'lucide-react';

const BidHistory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [bidHistory, setBidHistory] = useState<BidHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch user's bid history
  useEffect(() => {
    const fetchBidHistory = async () => {
      if (!user?.id) return;
      
      try {
        setIsLoading(true);
        const response = await bidHistoryAPI.getUserBidHistory(user.id);
        setBidHistory(response.bids);
      } catch (error: any) {
        toast({
          title: "Error loading bid history",
          description: error.message || "Failed to load your bidding history",
          variant: "destructive",
        });
        setBidHistory([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBidHistory();
  }, [user?.id, toast]);

  // Filter bid history based on search
  const filteredBids = bidHistory.filter(bid =>
    bid.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'won': return 'default';
      case 'lost': return 'destructive';
      case 'ongoing': return 'secondary';
      default: return 'outline';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'won': return Trophy;
      case 'lost': return TrendingDown;
      case 'ongoing': return Clock;
      default: return Gavel;
    }
  };

  // Calculate stats
  const stats = {
    totalBids: bidHistory.length,
    productsBidOn: [...new Set(bidHistory.map(b => b.productId))].length, // Count unique products
    won: bidHistory.filter(b => b.auctionStatus === 'won').length,
    lost: bidHistory.filter(b => b.auctionStatus === 'lost').length,
    ongoing: bidHistory.filter(b => b.auctionStatus === 'ongoing').length,
    totalSpent: bidHistory
      .filter(b => b.auctionStatus === 'won')
      .reduce((sum, b) => sum + (b.finalPrice || 0), 0)
  };

  // Debug logging
  console.log('📊 Bid History Stats:', {
    totalBids: stats.totalBids,
    productsBidOn: stats.productsBidOn,
    won: stats.won,
    lost: stats.lost,
    ongoing: stats.ongoing,
    totalSpent: stats.totalSpent,
    bidHistoryData: bidHistory.map(b => ({
      id: b.id,
      productName: b.productName,
      status: b.auctionStatus,
      bidAmount: b.bidAmount,
      finalPrice: b.finalPrice
    }))
  });

  if (isLoading) {
    return <LoadingScreen title="Loading Bid History" description="Fetching your bidding history..." />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Bid History</h1>
            <p className="text-muted-foreground mt-2">
              Track all your auction bids and results
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{stats.totalBids} Total Bids</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium">{stats.productsBidOn} Products</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalBids}</div>
              <div className="text-sm text-muted-foreground">Total Bids</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.productsBidOn}</div>
              <div className="text-sm text-muted-foreground">Products</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.won}</div>
              <div className="text-sm text-muted-foreground">Won</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.lost}</div>
              <div className="text-sm text-muted-foreground">Lost</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.ongoing}</div>
              <div className="text-sm text-muted-foreground">Ongoing</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className="text-lg font-bold text-green-600">
                ₹{stats.totalSpent.toLocaleString('en-IN')}
              </div>
              <div className="text-sm text-muted-foreground">Total Won</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bid history..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Bid History List */}
        {filteredBids.length > 0 ? (
          <div className="space-y-4">
            {filteredBids.map((bid) => {
              const StatusIcon = getStatusIcon(bid.auctionStatus);
              
              return (
                <Card key={bid.id} className="glass-card hover-tilt">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Product Image */}
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 overflow-hidden flex-shrink-0">
                        <ImageDisplay
                          imageId={bid.productImage}
                          alt={bid.productName}
                          className="w-full h-full object-cover rounded-lg"
                          fallbackClassName="w-full h-full flex items-center justify-center"
                          showLoader={false}
                        />
                      </div>

                      {/* Bid Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-semibold">{bid.productName}</h3>
                            <p className="text-sm text-muted-foreground">
                              Bid placed on {new Date(bid.bidDate).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={getStatusBadgeVariant(bid.auctionStatus)} className="flex items-center gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {bid.auctionStatus.toUpperCase()}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Your Bid */}
                          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                            <div className="text-sm text-muted-foreground">Your Bid</div>
                            <div className="text-lg font-bold text-primary">
                              ₹{bid.bidAmount.toLocaleString('en-IN')}
                            </div>
                          </div>

                          {/* Final Price */}
                          {bid.finalPrice && (
                            <div className={`p-3 rounded-lg border ${
                              bid.auctionStatus === 'won' 
                                ? 'bg-green-500/10 border-green-500/20' 
                                : 'bg-red-500/10 border-red-500/20'
                            }`}>
                              <div className="text-sm text-muted-foreground">Final Price</div>
                              <div className={`text-lg font-bold ${
                                bid.auctionStatus === 'won' ? 'text-green-700' : 'text-red-700'
                              }`}>
                                ₹{bid.finalPrice.toLocaleString('en-IN')}
                              </div>
                            </div>
                          )}

                          {/* Auction End Date */}
                          <div className="p-3 rounded-lg bg-background/50 border">
                            <div className="text-sm text-muted-foreground">Auction End</div>
                            <div className="text-sm font-medium">
                              {new Date(bid.auctionEndDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        {/* Result Message */}
                        {bid.auctionStatus === 'won' && (
                          <div className="mt-3 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                            <div className="flex items-center gap-2 text-green-700">
                              <Trophy className="h-4 w-4" />
                              <span className="text-sm font-medium">
                                Congratulations! You won this auction.
                              </span>
                            </div>
                          </div>
                        )}

                        {bid.auctionStatus === 'lost' && (
                          <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                            <div className="flex items-center gap-2 text-red-700">
                              <TrendingDown className="h-4 w-4" />
                              <span className="text-sm font-medium">
                                Someone else won this auction.
                              </span>
                            </div>
                          </div>
                        )}

                        {bid.auctionStatus === 'ongoing' && (
                          <div className="mt-3 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <div className="flex items-center gap-2 text-blue-700">
                              <Clock className="h-4 w-4" />
                              <span className="text-sm font-medium">
                                Auction is still active. Good luck!
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Bid History</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm 
                ? 'No bids match your search criteria'
                : 'You haven\'t placed any bids yet. Start bidding on auctions to see your history here!'
              }
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BidHistory;