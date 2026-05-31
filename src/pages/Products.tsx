import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from "@/components/layout/DashboardLayout";
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { productsAPI, Product } from '@/services/productsAPI';
import { listingsAPI, Listing } from '@/services/listingsAPI';
import { Search, Package, ShoppingCart, Eye, Heart, Filter, Gavel, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { ImageDisplay } from '@/components/ui/image-display';
import { CountdownTimer } from '@/components/ui/countdown-timer';

const Products = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [activeListings, setActiveListings] = useState<Listing[]>([]);
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'sold' | 'arriving'>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [isBidDialogOpen, setIsBidDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Manual refresh function
  const handleRefresh = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to view products",
        variant: "destructive",
      });
      return;
    }

    setIsRefreshing(true);
    try {
      // Update auction statuses first
      await listingsAPI.updateAuctionStatuses();
      
      // Fetch fresh data
      const [productsResponse, activeListingsResponse, allListingsResponse] = await Promise.all([
        productsAPI.getBuyerProducts(user.id, { search: searchTerm || undefined }),
        listingsAPI.getListings({ status: 'active' }),
        listingsAPI.getListings()
      ]);
      
      setProducts(productsResponse.products);
      setActiveListings(activeListingsResponse.listings);
      setAllListings(allListingsResponse.listings);
      
      toast({
        title: "Refreshed",
        description: "Product data has been updated",
      });
    } catch (error) {
      console.error('Refresh failed:', error);
      toast({
        title: "Refresh Failed",
        description: "Could not update product data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fetch products and active listings
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Fetch products excluding user's own products
        const productsResponse = await productsAPI.getBuyerProducts(user.id, {
          search: searchTerm || undefined
        });
        
        // Fetch active listings to show auction status
        const activeListingsResponse = await listingsAPI.getListings({ 
          status: 'active'
        });
        
        // Fetch all listings to show sold/ended status
        const allListingsResponse = await listingsAPI.getListings();
        
        setProducts(productsResponse.products);
        setActiveListings(activeListingsResponse.listings);
        setAllListings(allListingsResponse.listings);
      } catch (error: any) {
        console.error('Products page error:', error);
        toast({
          title: "Error loading products",
          description: error.message || "Failed to load products",
          variant: "destructive",
        });
        
        setProducts([]);
        setActiveListings([]);
        setAllListings([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [searchTerm, user?.id, toast]);

  // Auto-update auction statuses based on time (reduced frequency)
  useEffect(() => {
    const updateAuctionStatuses = async () => {
      try {
        // Call backend to update statuses
        const result = await listingsAPI.updateAuctionStatuses();
        
        if (result.updatedCount > 0) {
          console.log(`Updated ${result.updatedCount} auction statuses`);
          
          // Refresh data after updates
          const [activeListingsResponse, allListingsResponse] = await Promise.all([
            listingsAPI.getListings({ status: 'active' }),
            listingsAPI.getListings()
          ]);
          
          setActiveListings(activeListingsResponse.listings);
          setAllListings(allListingsResponse.listings);
        }
      } catch (error) {
        console.error('Failed to update auction statuses:', error);
      }
    };

    // Update statuses immediately when component mounts
    updateAuctionStatuses();
    
    // Then update every 2 minutes for less frequent updates
    const interval = setInterval(() => {
      updateAuctionStatuses();
    }, 120000); // Check every 2 minutes instead of 10 seconds
    
    return () => clearInterval(interval);
  }, []); // Run once on mount and set up interval

  // Get auction status for a product
  const getProductAuctionStatus = (productName: string) => {
    return activeListings.find(listing => listing.productName === productName);
  };

  // Get product status (available, sold, arriving)
  const getProductStatus = (productName: string) => {
    const activeListing = activeListings.find(listing => listing.productName === productName);
    if (activeListing) {
      return 'available'; // Currently in active auction - Available for Bidding
    }
    
    const soldListing = allListings.find(listing => 
      listing.productName === productName && listing.status === 'sold'
    );
    if (soldListing) {
      return 'sold'; // Product was sold in a completed auction
    }
    
    const anyListing = allListings.find(listing => listing.productName === productName);
    if (anyListing) {
      // Product has been listed before but not currently active
      if (anyListing.status === 'listed') {
        return 'available'; // Scheduled for future auction - Available for Bidding
      }
      return 'sold'; // Other completed auction statuses
    }
    
    // Product exists but has never been listed for auction
    return 'arriving'; // Arriving Soon - not yet placed for auction
  };

  // Filter products based on status
  const getFilteredProducts = () => {
    if (filterStatus === 'all') {
      return products;
    }
    
    return products.filter(product => {
      const status = getProductStatus(product.name);
      return status === filterStatus;
    });
  };

  // Handle bid placement for products that are in active auction
  const handlePlaceBid = async () => {
    if (!selectedProduct || !bidAmount) return;
    
    const auction = getProductAuctionStatus(selectedProduct.name);
    if (!auction) {
      toast({
        title: "No active auction",
        description: "This product is not currently in an active auction",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsPlacingBid(true);
      
      const bidAmountNum = parseFloat(bidAmount);
      
      if (bidAmountNum <= auction.currentBid) {
        throw new Error(`Bid must be higher than current bid of ₹${auction.currentBid.toLocaleString('en-IN')}`);
      }
      
      // Place bid on the auction (this already creates the bid record in the backend)
      const result = await listingsAPI.simulateBid(
        auction.id, 
        bidAmountNum, 
        user?.id, 
        user?.fullName
      );
      
      // Refresh listings to get updated data with highest bidder info
      const [activeListingsResponse, allListingsResponse] = await Promise.all([
        listingsAPI.getListings({ status: 'active' }),
        listingsAPI.getListings()
      ]);
      
      setActiveListings(activeListingsResponse.listings);
      setAllListings(allListingsResponse.listings);
      
      setBidAmount('');
      setSelectedProduct(null);
      setIsBidDialogOpen(false);
      
      toast({
        title: "Bid Placed Successfully!",
        description: `Your bid of ₹${bidAmountNum.toLocaleString('en-IN')} has been placed on ${selectedProduct.name}`,
      });
    } catch (error: any) {
      toast({
        title: "Error placing bid",
        description: error.message || "Failed to place bid",
        variant: "destructive",
      });
    } finally {
      setIsPlacingBid(false);
    }
  };

  // Open bid dialog for products in auction
  const openBidDialog = (product: Product) => {
    const auction = getProductAuctionStatus(product.name);
    if (!auction) {
      toast({
        title: "No active auction",
        description: "This product is not currently in an active auction",
        variant: "destructive",
      });
      return;
    }
    
    // Check if user is already the highest bidder
    if (auction.highestBidderId === user.id) {
      toast({
        title: "You're already the highest bidder",
        description: "Wait for another user to place a bid before you can bid again",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedProduct(product);
    setBidAmount((auction.currentBid + (auction.bidIncrement || 500)).toString()); // Use bidIncrement from database or default to 500
    setIsBidDialogOpen(true);
  };

  if (isLoading) {
    return <LoadingScreen title="Loading Products" description="Fetching available products..." />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Browse Products</h1>
          <p className="text-muted-foreground">
            Discover amazing products from other sellers
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Search and Refresh */}
          <div className="flex gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="default"
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
          
          {/* Filter Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('all')}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              All Products
            </Button>
            <Button
              variant={filterStatus === 'available' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('available')}
              className="gap-2"
            >
              <Gavel className="h-4 w-4" />
              Available for Bidding
            </Button>
            <Button
              variant={filterStatus === 'sold' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('sold')}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Sold
            </Button>
            <Button
              variant={filterStatus === 'arriving' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('arriving')}
              className="gap-2"
            >
              <Clock className="h-4 w-4" />
              Arriving Soon
            </Button>
          </div>
        </div>
        
        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {getFilteredProducts().length > 0 ? getFilteredProducts().map((product) => {
            const auction = getProductAuctionStatus(product.name);
            const productStatus = getProductStatus(product.name);
            const isInAuction = !!auction;
            
            return (
              <Card key={product.id} className="glass-card hover-tilt">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-1">{product.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        Base Price: ₹{product.basePrice.toLocaleString('en-IN')}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Badge variant={
                        productStatus === 'available' ? "default" : 
                        productStatus === 'sold' ? "destructive" :
                        productStatus === 'arriving' ? "secondary" : "outline"
                      }>
                        {productStatus === 'available' ? (isInAuction ? "LIVE AUCTION" : "SCHEDULED") : 
                         productStatus === 'sold' ? "SOLD" :
                         productStatus === 'arriving' ? "NOT LISTED YET" : "AVAILABLE"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {product.category}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Product Image */}
                  <div className="w-full h-32 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 overflow-hidden">
                    <ImageDisplay
                      imageId={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-lg"
                      fallbackClassName="w-full h-full flex items-center justify-center"
                      showLoader={false}
                    />
                  </div>

                  {/* Product Description */}
                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  {/* Status-specific Details */}
                  {productStatus === 'available' && isInAuction && auction && (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Current Bid:</span>
                        <span className="text-lg font-bold text-primary">
                          ₹{auction.currentBid.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total Bids:</span>
                        <span>{auction.totalBids}</span>
                      </div>
                      {auction.highestBidderName && (
                        <div className="flex items-center justify-between text-sm mt-1">
                          <span className="text-muted-foreground">Highest Bidder:</span>
                          <span className={auction.highestBidderId === user.id ? "font-semibold text-primary" : ""}>
                            {auction.highestBidderId === user.id ? "You" : auction.highestBidderName}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-xs text-muted-foreground">
                          Ends: {new Date(auction.endDateTime).toLocaleString()}
                        </div>
                        {auction.endDateTime && (
                          <CountdownTimer 
                            endDate={auction.endDateTime}
                            size="sm"
                            className="ml-2"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {productStatus === 'available' && !isInAuction && (() => {
                    const scheduledListing = allListings.find(l => l.productName === product.name && l.status === 'listed');
                    return scheduledListing && (
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-700">Starting Bid:</span>
                          <span className="text-lg font-bold text-blue-700">
                            ₹{scheduledListing.basePrice.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          Auction starts: {new Date(scheduledListing.startDateTime).toLocaleString()}
                        </div>
                      </div>
                    );
                  })()}

                  {productStatus === 'sold' && (() => {
                    const soldListing = allListings.find(l => l.productName === product.name && l.status === 'sold');
                    return soldListing && (
                      <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-red-700">Final Price:</span>
                          <span className="text-lg font-bold text-red-700">
                            ₹{soldListing.currentBid.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="text-xs text-red-600 mt-1">
                          Auction ended - Item sold
                        </div>
                      </div>
                    );
                  })()}

                  {productStatus === 'arriving' && (
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-green-700">Product Available</span>
                        <span className="text-lg font-bold text-green-700">
                          ₹{product.basePrice.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        Not yet listed for auction - Contact seller
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {productStatus === 'available' && isInAuction ? (
                      (() => {
                        const auction = getProductAuctionStatus(product.name);
                        const isCurrentHighestBidder = auction?.highestBidderId === user.id;
                        const isAdmin = user?.role === 'admin';
                        
                        return (
                          <Button 
                            onClick={() => openBidDialog(product)}
                            className="w-full gap-2"
                            disabled={isCurrentHighestBidder || isAdmin}
                            variant={isCurrentHighestBidder || isAdmin ? "outline" : "default"}
                          >
                            <ShoppingCart className="h-4 w-4" />
                            {isAdmin 
                              ? "Admin cannot bid" 
                              : isCurrentHighestBidder 
                                ? "You're the highest bidder" 
                                : "Place Bid"
                            }
                          </Button>
                        );
                      })()
                    ) : productStatus === 'available' && !isInAuction ? (
                      <Button 
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => {
                          const scheduledListing = allListings.find(l => l.productName === product.name && l.status === 'listed');
                          toast({
                            title: "Auction Scheduled",
                            description: `${product.name} auction starts ${new Date(scheduledListing?.startDateTime || '').toLocaleString()}`,
                          });
                        }}
                      >
                        <Clock className="h-4 w-4" />
                        Auction Scheduled
                      </Button>
                    ) : productStatus === 'sold' ? (
                      <Button 
                        variant="outline"
                        disabled
                        className="w-full gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Sold Out
                      </Button>
                    ) : productStatus === 'arriving' ? (
                      <div className="flex gap-2 w-full">
                        <Button 
                          variant="outline"
                          className="flex-1 gap-2"
                          onClick={() => {
                            toast({
                              title: "Product Details",
                              description: `${product.name} - ₹${product.basePrice.toLocaleString('en-IN')} - Not yet listed for auction`,
                            });
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          View Details
                        </Button>
                        <Button 
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            toast({
                              title: "Added to Wishlist",
                              description: `${product.name} has been added to your wishlist`,
                            });
                          }}
                        >
                          <Heart className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2 w-full">
                        <Button 
                          variant="outline"
                          className="flex-1 gap-2"
                          onClick={() => {
                            toast({
                              title: "Product Details",
                              description: `${product.name} - ₹${product.basePrice.toLocaleString('en-IN')}`,
                            });
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                        <Button 
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            toast({
                              title: "Added to Wishlist",
                              description: `${product.name} has been added to your wishlist`,
                            });
                          }}
                        >
                          <Heart className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          }) : (
            <div className="col-span-full text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Products Available</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No products match your search criteria.' : 
                 filterStatus === 'available' ? 'No products are currently available for bidding from other sellers.' :
                 filterStatus === 'sold' ? 'No products have been sold in auctions yet.' :
                 filterStatus === 'arriving' ? 'No products are waiting to be listed for auction.' :
                 'There are currently no products available from other sellers.'}
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Products from other sellers will appear here when they list items for auction</p>
                <p>• You can view your own products in the "My Products" section</p>
                <p>• Try switching to "Seller" mode to list your products for auction</p>
              </div>
            </div>
          )}
        </div>

        {/* Bid Dialog */}
        <Dialog open={isBidDialogOpen} onOpenChange={setIsBidDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Place Your Bid</DialogTitle>
              <DialogDescription>
                {selectedProduct && `Bidding on ${selectedProduct.name}`}
              </DialogDescription>
            </DialogHeader>
            
            {selectedProduct && (
              <div className="space-y-4">
                {(() => {
                  const auction = getProductAuctionStatus(selectedProduct.name);
                  if (!auction) return null;
                  
                  return (
                    <>
                      {/* Current Bid Info */}
                      <div className="p-3 rounded-lg bg-background/50 border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Current Bid:</span>
                          <span className="font-semibold">₹{auction.currentBid.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Minimum Bid:</span>
                          <span className="font-semibold">₹{(auction.currentBid + (auction.bidIncrement || 500)).toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      {/* Countdown Timer */}
                      <div className="p-3 rounded-lg glass-card border-primary/20 bg-primary/5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-primary">Time Remaining:</span>
                          {auction.endDateTime && (
                            <CountdownTimer 
                              endDate={auction.endDateTime}
                              size="md"
                              onExpired={() => {
                                setIsBidDialogOpen(false);
                                toast({
                                  title: "Auction Ended",
                                  description: "This auction has ended. You can no longer place bids.",
                                  variant: "destructive",
                                });
                              }}
                            />
                          )}
                        </div>
                      </div>

                      {/* Bid Amount Input */}
                      <div className="space-y-2">
                        <Label>Your Bid Amount (₹)</Label>
                        <Input
                          type="number"
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          placeholder="Enter your bid amount"
                          min={auction.currentBid + (auction.bidIncrement || 500)}
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {user?.role === 'admin' ? (
                          <Button 
                            disabled
                            className="flex-1"
                            variant="outline"
                          >
                            Admin users cannot place bids
                          </Button>
                        ) : (
                          <Button 
                            onClick={handlePlaceBid}
                            disabled={!bidAmount || parseFloat(bidAmount) < (auction.currentBid + (auction.bidIncrement || 500)) || isPlacingBid}
                            className="flex-1"
                          >
                            {isPlacingBid ? 'Placing Bid...' : 'Place Bid'}
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          onClick={() => setIsBidDialogOpen(false)}
                          disabled={isPlacingBid}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Products;
