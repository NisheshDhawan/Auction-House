import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ImageDisplay } from '@/components/ui/image-display';
import { bidHistoryAPI } from '@/services/bidHistoryAPI';
import { 
  Gavel, 
  Medal, 
  Award, 
  Search, 
  TrendingUp,
  User,
  Package,
  Loader2,
  ArrowLeft,
  ChevronRight,
  Star,
  Crown,
  Sparkles
} from 'lucide-react';

interface BidRecord {
  id: string;
  bidderName: string;
  bidderAvatar?: string;
  productName: string;
  productImage?: string;
  bidAmount: number;
  bidDate: string;
  status: 'active' | 'won' | 'lost' | 'outbid';
  auctionEndDate: string;
  productId: string;
  bidderId: string;
}

interface ProductSummary {
  productId: string;
  productName: string;
  productImage?: string;
  highestBid: number;
  highestBidder: string;
  totalBids: number;
  status: string;
  auctionEndDate: string;
  allBids: BidRecord[];
}

const AdminBiddingHistory = () => {
  const [bids, setBids] = useState<BidRecord[]>([]);
  const [productSummaries, setProductSummaries] = useState<ProductSummary[]>([]);
  const [filteredSummaries, setFilteredSummaries] = useState<ProductSummary[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductSummary | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('amount-desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch bids from API
  useEffect(() => {
    const fetchBids = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await bidHistoryAPI.getAllBids();
        
        if (!response || !response.bids) {
          throw new Error('Invalid response from server');
        }
        
        // Transform BidHistory to BidRecord format
        const transformedBids: BidRecord[] = response.bids.map(bid => {
          // Use status from backend, with fallback logic
          let status: 'active' | 'won' | 'lost' | 'outbid' = 'outbid';
          
          // Backend now provides lowercase status: 'active', 'won', 'lost', 'outbid'
          if (bid.status === 'active' || bid.status === 'won' || bid.status === 'lost' || bid.status === 'outbid') {
            status = bid.status as 'active' | 'won' | 'lost' | 'outbid';
          } else if (bid.auctionStatus === 'won') {
            status = 'won';
          } else if (bid.auctionStatus === 'lost') {
            status = 'lost';
          } else if (bid.isWinningBid) {
            status = 'active';
          }
          
          return {
            id: bid.id,
            bidderName: bid.bidderName || 'Unknown Bidder',
            bidderAvatar: undefined,
            productName: bid.productName,
            productImage: bid.productImage,
            bidAmount: bid.bidAmount,
            bidDate: bid.bidDate,
            status,
            auctionEndDate: bid.auctionEndDate,
            productId: bid.productId,
            bidderId: bid.bidderId || bid.userId
          };
        });
        
        setBids(transformedBids);
        
        // Group bids by product - use Map for O(n) complexity instead of reduce
        const productGroups = new Map<string, BidRecord[]>();
        
        transformedBids.forEach(bid => {
          const existing = productGroups.get(bid.productId);
          if (existing) {
            existing.push(bid);
          } else {
            productGroups.set(bid.productId, [bid]);
          }
        });

        // Create summaries with pre-sorted bids
        const summaries: ProductSummary[] = Array.from(productGroups.entries()).map(([productId, productBids]) => {
          // Sort once during creation
          const sortedBids = productBids.sort((a, b) => b.bidAmount - a.bidAmount);
          const highestBid = sortedBids[0];
          
          return {
            productId,
            productName: highestBid.productName,
            productImage: highestBid.productImage,
            highestBid: highestBid.bidAmount,
            highestBidder: highestBid.bidderName,
            totalBids: productBids.length,
            status: highestBid.status,
            auctionEndDate: highestBid.auctionEndDate,
            allBids: sortedBids
          };
        });
        
        setProductSummaries(summaries);
        setFilteredSummaries(summaries);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch bidding history');
        setBids([]);
        setProductSummaries([]);
        setFilteredSummaries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBids();
  }, []);

  // Memoize filtered and sorted summaries for better performance
  useEffect(() => {
    let filtered = [...productSummaries];

    // Apply search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(summary => 
        summary.productName.toLowerCase().includes(lowerSearch) ||
        summary.highestBidder.toLowerCase().includes(lowerSearch)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(summary => summary.status === statusFilter);
    }

    // Apply sorting
    switch (sortBy) {
      case 'amount-desc':
        filtered.sort((a, b) => b.highestBid - a.highestBid);
        break;
      case 'amount-asc':
        filtered.sort((a, b) => a.highestBid - b.highestBid);
        break;
      case 'bids-desc':
        filtered.sort((a, b) => b.totalBids - a.totalBids);
        break;
      case 'bids-asc':
        filtered.sort((a, b) => a.totalBids - b.totalBids);
        break;
    }

    setFilteredSummaries(filtered);
  }, [productSummaries, searchTerm, statusFilter, sortBy]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'won':
        return <Badge className="bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-1 border-0">Won</Badge>;
      case 'active':
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1 border-0">Active</Badge>;
      case 'outbid':
        return <Badge className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-3 py-1 border-0">Outbid</Badge>;
      case 'lost':
        return <Badge className="bg-red-600 hover:bg-red-700 text-white font-semibold px-3 py-1 border-0">Lost</Badge>;
      default:
        return <Badge className="bg-gray-600 hover:bg-gray-700 text-white font-semibold px-3 py-1 border-0">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // If a product is selected, show its detailed bid history
  if (selectedProduct) {
    return (
      <div className="space-y-6 mt-20">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Back Button */}
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => setSelectedProduct(null)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Products
            </Button>
            <div>
              <h2 className="text-3xl font-bold text-white">
                {selectedProduct.productName}
              </h2>
              <p className="text-gray-400">Complete bidding history and analytics</p>
            </div>
          </div>

          {/* Product Summary Card */}
          <Card className="glass-card">
            <CardContent className="p-8">
              <div className="flex items-center gap-8">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-700 shadow-lg flex items-center justify-center">
                  <ImageDisplay imageId={selectedProduct.productImage} alt={selectedProduct.productName} className="w-full h-full object-cover" fallbackClassName="w-full h-full flex items-center justify-center bg-gray-700" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-4">{selectedProduct.productName}</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-green-900/40 border border-green-700/50 rounded-xl">
                      <p className="text-sm text-green-400 font-medium">Highest Bid</p>
                      <p className="text-2xl font-bold text-green-300">{formatCurrency(selectedProduct.highestBid)}</p>
                    </div>
                    <div className="text-center p-4 bg-blue-900/40 border border-blue-700/50 rounded-xl">
                      <p className="text-sm text-blue-400 font-medium">Total Bids</p>
                      <p className="text-2xl font-bold text-blue-300">{selectedProduct.totalBids}</p>
                    </div>
                    <div className="text-center p-4 bg-purple-900/40 border border-purple-700/50 rounded-xl">
                      <p className="text-sm text-purple-400 font-medium">Status</p>
                      <div className="mt-2">{getStatusBadge(selectedProduct.status)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Bid History */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-xl font-serif font-bold gradient-text">Complete Bid History ({selectedProduct.totalBids})</CardTitle>
              <CardDescription className="text-gray-400">All bids placed on this product, sorted by amount</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {selectedProduct.allBids.map((bid, index) => (
                  <div
                    key={bid.id}
                    className={`p-6 rounded-xl border transition-all duration-200 ${
                      index === 0 
                        ? 'border-green-700/60 bg-green-900/30' 
                        : 'border-gray-700/60 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {index === 0 && (
                          <div className="p-2 bg-green-600 rounded-full">
                            <Crown className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-blue-800 text-blue-200 font-bold text-lg">
                              {bid.bidderName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-lg text-white">{bid.bidderName}</p>
                            <p className="text-sm text-gray-400">
                              {formatDate(bid.bidDate)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${index === 0 ? 'text-green-400' : 'text-white'}`}>
                            {formatCurrency(bid.bidAmount)}
                          </p>
                          {index === 0 && (
                            <p className="text-sm text-green-400 font-medium">Winning Bid</p>
                          )}
                        </div>
                        {getStatusBadge(bid.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 mt-20">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-serif font-bold gradient-text mb-2">
          Bidding Analytics
        </h2>
        <p className="text-muted-foreground">
          Monitor auction performance, track bidding activity, and analyze market trends
        </p>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">

        {/* Loading State */}
        {loading && (
          <Card className="glass-card">
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-medium text-foreground mb-2">Loading Bidding Analytics</h3>
                  <p className="text-xs text-muted-foreground">Fetching real-time auction data...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && !loading && (
          <Card className="glass-card">
            <CardContent className="p-12">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="p-4 bg-red-50 rounded-full">
                    <Gavel className="w-12 h-12 text-red-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2">Failed to Load Bidding Data</h3>
                  <p className="text-xs text-muted-foreground mb-6">{error}</p>
                  <Button 
                    onClick={() => window.location.reload()} 
                    className="px-6 py-2"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content - only show when not loading and no error */}
        {!loading && !error && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="glass-card hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground mb-1">{productSummaries.length}</div>
                  <p className="text-xs text-muted-foreground">with active bids</p>
                </CardContent>
              </Card>
              
              <Card className="glass-card hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Highest Bid</CardTitle>
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Crown className="w-5 h-5 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground mb-1">
                    {productSummaries.length > 0 ? formatCurrency(Math.max(...productSummaries.map(p => p.highestBid))) : '₹0'}
                  </div>
                  <p className="text-xs text-muted-foreground">record amount</p>
                </CardContent>
              </Card>
              
              <Card className="glass-card hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Bids</CardTitle>
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground mb-1">{bids.length}</div>
                  <p className="text-xs text-muted-foreground">across all auctions</p>
                </CardContent>
              </Card>
              
              <Card className="glass-card hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Active Bidders</CardTitle>
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <User className="w-5 h-5 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground mb-1">{new Set(bids.map(b => b.bidderId)).size}</div>
                  <p className="text-xs text-muted-foreground">unique participants</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Search className="w-5 h-5 text-primary" />
                  Filters & Search
                </CardTitle>
                <CardDescription>
                  Find specific products, bidders, or filter by auction status
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search by product name, bidder, or auction details..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-input bg-background text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                      <option value="outbid">Outbid</option>
                    </select>
                    
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-3 py-2 border border-input bg-background text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    >
                      <option value="amount-desc">Highest Bid</option>
                      <option value="amount-asc">Lowest Bid</option>
                      <option value="bids-desc">Most Bids</option>
                      <option value="bids-asc">Least Bids</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product Summaries */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Package className="w-5 h-5 text-primary" />
                  Products with Bids
                </CardTitle>
                <CardDescription>
                  Showing {filteredSummaries.length} of {productSummaries.length} products with bidding activity
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {filteredSummaries.map((summary, index) => {
                    // Get top 3 products by highest bid from the original productSummaries (not filtered)
                    const sortedByBid = [...productSummaries].sort((a, b) => b.highestBid - a.highestBid);
                    const top3ProductIds = sortedByBid.slice(0, 3).map(p => p.productId);
                    const isTop3 = top3ProductIds.includes(summary.productId);
                    const topRank = top3ProductIds.indexOf(summary.productId) + 1;
                    
                    return (
                      <div
                        key={summary.productId}
                        className={`group relative p-6 rounded-xl cursor-pointer transition-all duration-200 border hover:shadow-md ${
                          isTop3 
                            ? 'border-yellow-200 bg-yellow-50' 
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedProduct(summary)}
                      >
                        {/* Top 3 Crown Badge */}
                        {isTop3 && (
                          <div className="absolute -top-2 -right-2 z-10">
                            <div className="flex items-center gap-1 bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                              {topRank === 1 && <Crown className="w-3 h-3" />}
                              {topRank === 2 && <Medal className="w-3 h-3" />}
                              {topRank === 3 && <Award className="w-3 h-3" />}
                              #{topRank}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-6">
                            {/* Product Image */}
                            <div className={`relative w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center bg-gray-100 ${
                              isTop3 ? 'ring-2 ring-yellow-300' : 'ring-1 ring-gray-200'
                            }`}>
                              <ImageDisplay imageId={summary.productImage} alt={summary.productName} className="w-full h-full object-cover" fallbackClassName="w-full h-full flex items-center justify-center bg-gray-100" />
                            </div>
                            
                            {/* Product Info */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-gray-900">
                                  {summary.productName}
                                </h3>
                                {isTop3 && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-gray-500" />
                                  <span className="text-xs text-gray-600">
                                    Top bidder: <span className="text-blue-600 font-semibold">{summary.highestBidder}</span>
                                  </span>
                                </div>
                                <Badge variant="outline" className="px-2 py-1 text-gray-700 border-gray-400">
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                  {summary.totalBids} bids
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          {/* Bid Amount & Status */}
                          <div className="flex items-center gap-6">
                            <div className="text-right space-y-1">
                              <p className="text-2xl font-bold text-gray-900">
                                {formatCurrency(summary.highestBid)}
                              </p>
                              <p className="text-xs text-gray-500">
                                Highest Bid
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              {getStatusBadge(summary.status)}
                              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform duration-200" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Empty States */}
                  {filteredSummaries.length === 0 && productSummaries.length > 0 && (
                    <div className="text-center py-16">
                      <div className="flex justify-center mb-6">
                        <div className="p-4 bg-gray-100 rounded-full">
                          <Search className="w-12 h-12 text-gray-400" />
                        </div>
                      </div>
                      <h3 className="text-sm font-medium text-foreground mb-2">No matching products found</h3>
                      <p className="text-xs text-muted-foreground mb-6">Try adjusting your search terms or filters to find what you're looking for</p>
                      <Button 
                        onClick={() => {setSearchTerm(''); setStatusFilter('all');}}
                        variant="outline"
                      >
                        Clear Filters
                      </Button>
                    </div>
                  )}
                  
                  {productSummaries.length === 0 && (
                    <div className="text-center py-16">
                      <div className="flex justify-center mb-6">
                        <div className="p-4 bg-blue-50 rounded-full">
                          <Gavel className="w-12 h-12 text-blue-600" />
                        </div>
                      </div>
                      <h3 className="text-sm font-medium text-foreground mb-2">No auction activity yet</h3>
                      <p className="text-xs text-muted-foreground">Products with bidding activity will appear here once auctions begin</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminBiddingHistory;