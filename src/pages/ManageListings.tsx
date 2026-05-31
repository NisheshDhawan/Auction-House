import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useToast } from '@/hooks/use-toast';
import { useCountdown } from '@/hooks/useCountdown';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { productsAPI, Product } from '@/services/productsAPI';
import { listingsAPI, Listing, ListingFormData } from '@/services/listingsAPI';
import { purchasesAPI } from '@/services/purchasesAPI';
import { bidHistoryAPI } from '@/services/bidHistoryAPI';
import { ordersAPI } from '@/services/ordersAPI';
import { customersAPI } from '@/services/customersAPI';
import { ImageDisplay } from '@/components/ui/image-display';
import { 
  Package, 
  Calendar, 
  Clock, 
  Trash2,
  Plus,
  Search,
  Timer,
  StopCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { RupeeIcon } from '@/components/ui/rupee-icon';

// Countdown Timer Component
const CountdownTimer = ({ endDateTime, onExpire }: { endDateTime: string; onExpire?: () => void }) => {
  const countdown = useCountdown(endDateTime);
  
  useEffect(() => {
    if (countdown.isExpired && onExpire) {
      onExpire();
    }
  }, [countdown.isExpired, onExpire]);

  if (countdown.isExpired) {
    return <span className="text-red-600 font-semibold">Auction Ended</span>;
  }

  // Format the countdown time
  const formatTime = () => {
    if (countdown.days > 0) {
      return `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m`;
    } else if (countdown.hours > 0) {
      return `${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s`;
    } else {
      return `${countdown.minutes}m ${countdown.seconds}s`;
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Timer className="h-4 w-4 text-primary" />
      <span className="font-mono text-sm font-semibold text-primary">
        {formatTime()}
      </span>
    </div>
  );
};

const ManageListings = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Prevent admin users from accessing seller features
  if (user?.role === 'admin') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Calendar className="h-16 w-16 text-muted-foreground mx-auto" />
            <h2 className="text-2xl font-semibold">Access Restricted</h2>
            <p className="text-muted-foreground max-w-md">
              Admin users cannot create or manage listings. This feature is only available for regular users who want to sell items.
            </p>
            <Button 
              onClick={() => window.location.href = '/dashboard'}
              variant="outline"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  
  const [products, setProducts] = useState<Product[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingListing, setIsCreatingListing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [listingToClose, setListingToClose] = useState<Listing | null>(null);
  const [isClosingAuction, setIsClosingAuction] = useState(false);
  
  // Form state for creating listing
  const [listingForm, setListingForm] = useState({
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: ''
  });

  // Helper function to get local date string for date inputs
  const getLocalDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fetch products and listings
  const fetchData = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const [productsData, listingsData, availableData] = await Promise.all([
        productsAPI.getSellerProducts(user.id),
        listingsAPI.getSellerListings(user.id),
        listingsAPI.getAvailableProducts(user.id)
      ]);
      
      setProducts(productsData.products);
      setListings(listingsData.listings);
      setAvailableProducts(availableData.availableProducts);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message || "Failed to load products and listings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id, toast]);

  // Update listing statuses based on time
  useEffect(() => {
    const updateListingStatuses = () => {
      const now = new Date();
      let hasUpdates = false;
      
      const updatedListings = listings.map(listing => {
        const startTime = new Date(listing.startDateTime);
        const endTime = new Date(listing.endDateTime);
        let newStatus = listing.status;
        
        if (listing.status === 'listed' && now >= startTime) {
          newStatus = 'active';
          hasUpdates = true;
        } else if (listing.status === 'active' && now >= endTime) {
          newStatus = listing.currentBid > listing.basePrice ? 'sold' : 'unsold';
          hasUpdates = true;
        }
        
        if (newStatus !== listing.status) {
          // Update in backend/localStorage
          listingsAPI.updateListingStatus(listing.id, newStatus).catch(console.error);
          return { ...listing, status: newStatus };
        }
        
        return listing;
      });
      
      if (hasUpdates) {
        setListings(updatedListings);
      }
    };

    // Update statuses immediately and then every minute
    updateListingStatuses();
    const interval = setInterval(updateListingStatuses, 60000);
    
    return () => clearInterval(interval);
  }, [listings]);

  // Get products that are not currently listed
  const getAvailableProductsForListing = () => {
    return products.filter(product => 
      !listings.some(listing => 
        listing.productId === product.id && 
        ['listed', 'active'].includes(listing.status)
      )
    );
  };

  // Get product with listing status
  const getProductListingStatus = (productId: string) => {
    const listing = listings.find(l => l.productId === productId);
    return listing || null;
  };

  // Filter products based on search and status
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    
    const listing = getProductListingStatus(product.id);
    if (statusFilter === 'unlisted') {
      return matchesSearch && !listing;
    }
    
    return matchesSearch && listing && listing.status === statusFilter;
  });

  // Handle listing creation
  const handleCreateListing = async () => {
    if (!selectedProduct) return;
    
    // Check if user is authenticated
    if (!user || !user.id) {
      toast({
        title: "Authentication required",
        description: "Please log in to create a listing",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsCreatingListing(true);
      
      // Validate dates with explicit timezone handling
      const startDateTime = new Date(`${listingForm.startDate}T${listingForm.startTime}`);
      const endDateTime = new Date(`${listingForm.endDate}T${listingForm.endTime}`);
      const now = new Date();
      
      // Allow auctions to start immediately - only check that start time is not more than 1 hour in the past
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      if (startDateTime < oneHourAgo) {
        throw new Error('Start date and time cannot be more than 1 hour in the past');
      }
      
      if (endDateTime <= startDateTime) {
        throw new Error('End date and time must be after start date and time');
      }
      
      // Ensure sellerId is a valid UUID
      if (!user.id || typeof user.id !== 'string' || user.id.length < 10) {
        throw new Error('Invalid user ID. Please log in again.');
      }
      
      const listingData: ListingFormData = {
        productId: selectedProduct.id,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        sellerId: user.id,
        sellerName: user.fullName || user.email || 'Unknown User'
      };
      
      const newListing = await listingsAPI.createListing(listingData);
      setListings(prev => [...prev, newListing]);
      
      // Reset form
      setSelectedProduct(null);
      setListingForm({
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: ''
      });
      setIsDialogOpen(false);
      
      toast({
        title: "Listing created successfully",
        description: `${selectedProduct.name} has been scheduled for auction`,
      });
    } catch (error: any) {
      toast({
        title: "Error creating listing",
        description: error.message || "Failed to create listing",
        variant: "destructive",
      });
    } finally {
      setIsCreatingListing(false);
    }
  };

  // Handle listing deletion
  const handleDeleteListing = async (listing: Listing) => {
    if (listing.status === 'active') {
      toast({
        title: "Cannot delete active listing",
        description: "You cannot delete a listing that is currently active",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await listingsAPI.deleteListing(listing.id);
      setListings(prev => prev.filter(l => l.id !== listing.id));
      
      toast({
        title: "Listing deleted",
        description: `${listing.productName} listing has been removed`,
      });
    } catch (error: any) {
      toast({
        title: "Error deleting listing",
        description: error.message || "Failed to delete listing",
        variant: "destructive",
      });
    }
  };

  // Handle quick close auction (only if bids have been placed)
  const handleQuickCloseAuction = async (listing: Listing) => {
    if (listing.totalBids === 0) {
      toast({
        title: "Cannot close auction",
        description: "No bids have been placed on this auction yet",
        variant: "destructive",
      });
      return;
    }

    // Open confirmation dialog
    setListingToClose(listing);
    setIsCloseConfirmOpen(true);
  };

  // Confirm and execute quick close
  const confirmQuickClose = async () => {
    console.log('=== CONFIRM QUICK CLOSE STARTED ===');
    if (!listingToClose) {
      console.log('No listing to close');
      return;
    }

    console.log('Closing listing:', {
      id: listingToClose.id,
      currentBid: listingToClose.currentBid,
      basePrice: listingToClose.basePrice,
      totalBids: listingToClose.totalBids,
      highestBidderName: listingToClose.highestBidderName
    });

    try {
      setIsClosingAuction(true);
      
      // Determine the new status based on whether there are bids
      const newStatus = listingToClose.currentBid > listingToClose.basePrice ? 'sold' : 'unsold';
      console.log('Determined new status:', newStatus);
      
      // Update the listing status to end the auction
      console.log('Updating listing status...');
      await listingsAPI.updateListingStatus(listingToClose.id, newStatus);
      console.log('Listing status updated successfully');
      
      // If sold, trigger the same logic as natural auction expiration
      if (newStatus === 'sold') {
        console.log('Triggering auction expiration logic...');
        await handleAuctionExpire(listingToClose.id);
        console.log('Auction expiration logic completed');
      }
      
      // Update local state
      console.log('Updating local state...');
      setListings(prev => prev.map(l => 
        l.id === listingToClose.id ? { ...l, status: newStatus as Listing['status'] } : l
      ));
      
      const winnerMessage = newStatus === 'sold' && listingToClose.highestBidderName 
        ? `Auction closed! Item sold to ${listingToClose.highestBidderName} for ₹${listingToClose.currentBid.toLocaleString('en-IN')}`
        : 'Auction closed successfully';
      
      console.log('Showing success toast:', winnerMessage);
      toast({
        title: "Auction Closed",
        description: winnerMessage,
        variant: newStatus === 'sold' ? 'default' : 'destructive'
      });

      // Close confirmation dialog
      console.log('Closing dialog...');
      setIsCloseConfirmOpen(false);
      setListingToClose(null);
      console.log('=== CONFIRM QUICK CLOSE COMPLETED ===');
    } catch (error: any) {
      console.error('=== CONFIRM QUICK CLOSE ERROR ===', error);
      toast({
        title: "Error closing auction",
        description: error.message || "Failed to close auction",
        variant: "destructive",
      });
    } finally {
      setIsClosingAuction(false);
    }
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'listed': return 'secondary';
      case 'active': return 'default';
      case 'sold': return 'default';
      case 'unsold': return 'destructive';
      default: return 'outline';
    }
  };

  // Handle auction expiration
  const handleAuctionExpire = async (listingId: string) => {
    const listing = listings.find(l => l.id === listingId);
    if (!listing) return;
    
    try {
      const newStatus = listing.currentBid > listing.basePrice ? 'sold' : 'unsold';
      
      // Update listing status only - no ownership transfer or record creation until payment
      const updatedListing = {
        ...listing,
        status: newStatus,
        winnerName: newStatus === 'sold' ? listing.highestBidderName : undefined,
        updatedAt: new Date().toISOString()
      };

      // Update in backend
      await listingsAPI.updateListingStatus(listingId, newStatus);
      
      // Update local state
      setListings(prev => prev.map(l => 
        l.id === listingId ? { ...updatedListing, status: newStatus as Listing['status'] } : l
      ));
      
      const winnerMessage = newStatus === 'sold' && listing.highestBidderName 
        ? `Item sold to ${listing.highestBidderName} for ₹${listing.currentBid.toLocaleString('en-IN')}! Winner will receive payment instructions via email.`
        : newStatus === 'sold' 
        ? 'Item sold! Winner will receive payment instructions via email.' 
        : 'No bids received';
      
      toast({
        title: "Auction Ended",
        description: `${listing.productName} auction has ended - ${winnerMessage}`,
        variant: newStatus === 'sold' ? 'default' : 'destructive'
      });

      // Note: Purchase records, orders, and ownership transfer will be created 
      // only after payment verification in the payment flow
    } catch (error) {
      console.error('Failed to update listing status:', error);
    }
  };



  if (isLoading) {
    return <LoadingScreen title="Loading Listings" description="Fetching your product listings..." />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Manage Listings</h1>
            <p className="text-muted-foreground mt-2">
              Create and manage your auction listings
            </p>
          </div>
          <Button 
            onClick={fetchData}
            variant="outline"
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Schedule Auction
                </DialogTitle>
                <DialogDescription>
                  Set the start and end times for your auction with easy-to-use date and time pickers
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Available Products Selection */}
                {!selectedProduct && (
                  <div className="space-y-3">
                    <Label>Select Product to List</Label>
                    {getAvailableProductsForListing().length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {getAvailableProductsForListing().map((product) => (
                          <div
                            key={product.id}
                            onClick={() => setSelectedProduct(product)}
                            className="p-3 rounded-lg border bg-background/50 hover:bg-primary/5 cursor-pointer transition-colors flex items-center gap-3"
                          >
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 overflow-hidden">
                              <ImageDisplay
                                imageId={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                showLoader={false}
                              />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-muted-foreground">
                                Base Price: ₹{product.basePrice.toLocaleString('en-IN')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Category: {product.category}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center border rounded-lg bg-muted/20">
                        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <h3 className="font-semibold mb-2">No Products Available</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          All your products are currently listed for auction. Create a new product first or wait for existing auctions to end.
                        </p>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setIsDialogOpen(false);
                            // Navigate to manage products - you might want to use router here
                            window.location.href = '/dashboard/products';
                          }}
                        >
                          Create New Product
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Product Display */}
                {selectedProduct && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Product to List</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedProduct(null)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Change Product
                      </Button>
                    </div>
                    <div className="p-3 rounded-lg border bg-background/50 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 overflow-hidden">
                        <ImageDisplay
                          imageId={selectedProduct.image}
                          alt={selectedProduct.name}
                          className="w-full h-full object-cover"
                          showLoader={false}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{selectedProduct.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Base Price: ₹{selectedProduct.basePrice.toLocaleString('en-IN')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Category: {selectedProduct.category}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Auction Timing Section */}
                <div className="space-y-4 p-4 rounded-lg border bg-gradient-to-br from-primary/5 to-accent/5">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <Label className="text-base font-semibold">Auction Schedule</Label>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="space-y-2">
                    <Label className="text-sm">Quick Presets</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const now = new Date();
                          const startTime = new Date(); // Start immediately
                          const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours later
                          
                          setListingForm({
                            startDate: startTime.getFullYear() + '-' + 
                                      String(startTime.getMonth() + 1).padStart(2, '0') + '-' + 
                                      String(startTime.getDate()).padStart(2, '0'),
                            startTime: String(startTime.getHours()).padStart(2, '0') + ':' + 
                                      String(startTime.getMinutes()).padStart(2, '0'),
                            endDate: endTime.getFullYear() + '-' + 
                                    String(endTime.getMonth() + 1).padStart(2, '0') + '-' + 
                                    String(endTime.getDate()).padStart(2, '0'),
                            endTime: String(endTime.getHours()).padStart(2, '0') + ':' + 
                                    String(endTime.getMinutes()).padStart(2, '0')
                          });
                        }}
                        className="text-xs hover:bg-primary/10"
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        24h Auction
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const now = new Date();
                          const startTime = new Date(); // Start immediately
                          const endTime = new Date(startTime.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days later
                          
                          setListingForm({
                            startDate: startTime.getFullYear() + '-' + 
                                      String(startTime.getMonth() + 1).padStart(2, '0') + '-' + 
                                      String(startTime.getDate()).padStart(2, '0'),
                            startTime: String(startTime.getHours()).padStart(2, '0') + ':' + 
                                      String(startTime.getMinutes()).padStart(2, '0'),
                            endDate: endTime.getFullYear() + '-' + 
                                    String(endTime.getMonth() + 1).padStart(2, '0') + '-' + 
                                    String(endTime.getDate()).padStart(2, '0'),
                            endTime: String(endTime.getHours()).padStart(2, '0') + ':' + 
                                    String(endTime.getMinutes()).padStart(2, '0')
                          });
                        }}
                        className="text-xs hover:bg-primary/10"
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        3 Day Auction
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const now = new Date();
                          const startTime = new Date(); // Start immediately
                          const endTime = new Date(startTime.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days later
                          
                          setListingForm({
                            startDate: startTime.getFullYear() + '-' + 
                                      String(startTime.getMonth() + 1).padStart(2, '0') + '-' + 
                                      String(startTime.getDate()).padStart(2, '0'),
                            startTime: String(startTime.getHours()).padStart(2, '0') + ':' + 
                                      String(startTime.getMinutes()).padStart(2, '0'),
                            endDate: endTime.getFullYear() + '-' + 
                                    String(endTime.getMonth() + 1).padStart(2, '0') + '-' + 
                                    String(endTime.getDate()).padStart(2, '0'),
                            endTime: String(endTime.getHours()).padStart(2, '0') + ':' + 
                                    String(endTime.getMinutes()).padStart(2, '0')
                          });
                        }}
                        className="text-xs hover:bg-primary/10"
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        7 Day Auction
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setListingForm({
                            startDate: '',
                            startTime: '',
                            endDate: '',
                            endTime: ''
                          });
                        }}
                        className="text-xs text-muted-foreground hover:bg-destructive/10"
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>

                  {/* Start Date & Time */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-green-700">Auction Start</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Date</Label>
                        <div className="relative">
                          <Input
                            type="date"
                            value={listingForm.startDate}
                            onChange={(e) => setListingForm(prev => ({ ...prev, startDate: e.target.value }))}
                            min={getLocalDateString()}
                            className="pr-10 border-green-200 focus:border-green-400"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-green-100"
                            onClick={() => {
                              const input = document.querySelector('input[type="date"]') as HTMLInputElement;
                              if (input) input.showPicker();
                            }}
                          >
                            <Calendar className="h-4 w-4 text-green-600" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Time</Label>
                        <div className="relative">
                          <Input
                            type="time"
                            value={listingForm.startTime}
                            onChange={(e) => setListingForm(prev => ({ ...prev, startTime: e.target.value }))}
                            className="pr-10 border-green-200 focus:border-green-400"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-green-100"
                            onClick={() => {
                              const inputs = document.querySelectorAll('input[type="time"]');
                              const startTimeInput = inputs[0] as HTMLInputElement;
                              if (startTimeInput) startTimeInput.showPicker();
                            }}
                          >
                            <Clock className="h-4 w-4 text-green-600" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* End Date & Time */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-red-700">Auction End</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Date</Label>
                        <div className="relative">
                          <Input
                            type="date"
                            value={listingForm.endDate}
                            onChange={(e) => setListingForm(prev => ({ ...prev, endDate: e.target.value }))}
                            min={listingForm.startDate || getLocalDateString()}
                            className="pr-10 border-red-200 focus:border-red-400"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-red-100"
                            onClick={() => {
                              const inputs = document.querySelectorAll('input[type="date"]');
                              const endDateInput = inputs[1] as HTMLInputElement;
                              if (endDateInput) endDateInput.showPicker();
                            }}
                          >
                            <Calendar className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Time</Label>
                        <div className="relative">
                          <Input
                            type="time"
                            value={listingForm.endTime}
                            onChange={(e) => setListingForm(prev => ({ ...prev, endTime: e.target.value }))}
                            className="pr-10 border-red-200 focus:border-red-400"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-red-100"
                            onClick={() => {
                              const inputs = document.querySelectorAll('input[type="time"]');
                              const endTimeInput = inputs[1] as HTMLInputElement;
                              if (endTimeInput) endTimeInput.showPicker();
                            }}
                          >
                            <Clock className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Duration Display */}
                  {listingForm.startDate && listingForm.startTime && listingForm.endDate && listingForm.endTime && (
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <div className="flex items-center gap-2 text-blue-700">
                        <Timer className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          Auction Duration: {(() => {
                            const start = new Date(`${listingForm.startDate}T${listingForm.startTime}`);
                            const end = new Date(`${listingForm.endDate}T${listingForm.endTime}`);
                            const diffMs = end.getTime() - start.getTime();
                            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                            const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                            
                            if (diffDays > 0) {
                              return `${diffDays} day${diffDays > 1 ? 's' : ''} ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
                            } else if (diffHours > 0) {
                              return `${diffHours} hour${diffHours > 1 ? 's' : ''} ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
                            } else {
                              return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
                            }
                          })()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleCreateListing}
                  disabled={!selectedProduct || !listingForm.startDate || !listingForm.startTime || !listingForm.endDate || !listingForm.endTime || isCreatingListing}
                  className="w-full"
                >
                  {isCreatingListing ? 'Creating...' : 'Schedule Auction'}
                </Button>
              </div>
            </DialogContent>
        </Dialog>

        {/* Create Listing Button */}
        <div className="flex justify-between items-center">
          <div></div>
          <Button 
            onClick={() => {
              setSelectedProduct(null);
              setIsDialogOpen(true);
            }}
            disabled={getAvailableProductsForListing().length === 0}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create New Listing
          </Button>
        </div>

        {/* Quick Stats */}
        {products.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="glass-card hover-tilt">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-primary">{products.length}</div>
                    <div className="text-sm text-muted-foreground">Total Products</div>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/20 border border-primary/30">
                    <Package className="h-6 w-6 text-primary stroke-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card hover-tilt">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-blue-500">
                      {listings.filter(l => l.status === 'active').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Active Auctions</div>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/20 border border-blue-500/30">
                    <Timer className="h-6 w-6 text-blue-500 stroke-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card hover-tilt">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-green-500">
                      {listings.filter(l => l.status === 'sold').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Items Sold</div>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/30">
                    <RupeeIcon className="h-6 w-6 text-green-500 stroke-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card hover-tilt">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-orange-500">
                      {getAvailableProductsForListing().length}
                    </div>
                    <div className="text-sm text-muted-foreground">Available to List</div>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-500/20 border border-orange-500/30">
                    <Plus className="h-6 w-6 text-orange-500 stroke-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              <SelectItem value="unlisted">Not Listed</SelectItem>
              <SelectItem value="listed">Listed</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="unsold">Unsold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => {
              const listing = getProductListingStatus(product.id);
              const isListed = !!listing;
              
              return (
                <Card key={product.id} className="glass-card hover-tilt h-full flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          Base: ₹{product.basePrice.toLocaleString('en-IN')}
                        </CardDescription>
                      </div>
                      <Badge variant={isListed ? getStatusBadgeVariant(listing.status) : 'outline'}>
                        {isListed ? listing.status : 'unlisted'}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4 flex-1 flex flex-col">
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

                    {/* Product Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Package className="h-4 w-4" />
                        <span>Category: {product.category}</span>
                      </div>
                      <div className="text-muted-foreground">
                        <span className="line-clamp-2">{product.description}</span>
                      </div>
                    </div>

                    {/* Listing Status Info - Fixed Height Container */}
                    <div className="min-h-[200px] flex flex-col justify-between">
                      {isListed ? (
                        <div className="space-y-4">
                          {/* Timing Information */}
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>Start: {new Date(listing.startDateTime).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>End: {new Date(listing.endDateTime).toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Current Status Info */}
                          {listing.status === 'active' && (
                            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">Time Remaining:</span>
                                <CountdownTimer 
                                  endDateTime={listing.endDateTime}
                                  onExpire={() => handleAuctionExpire(listing.id)}
                                />
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-sm text-muted-foreground">Current Bid:</span>
                                <span className="text-sm font-semibold">
                                  ₹{listing.currentBid.toLocaleString('en-IN')}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Total Bids:</span>
                                <span className="text-sm">{listing.totalBids}</span>
                              </div>
                            </div>
                          )}

                          {listing.status === 'sold' && (
                            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-green-700">Final Price:</span>
                                <span className="text-sm font-bold text-green-700">
                                  ₹{listing.currentBid.toLocaleString('en-IN')}
                                </span>
                              </div>
                              {(listing.winnerName || listing.highestBidderName) && (
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-green-700">Winner:</span>
                                  <span className="text-sm font-semibold text-green-700">
                                    {listing.winnerName || listing.highestBidderName}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Total Bids:</span>
                                <span className="text-sm">{listing.totalBids}</span>
                              </div>
                            </div>
                          )}

                          {listing.status === 'unsold' && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                              <div className="text-sm text-red-700 text-center">
                                No bids received - Reserve price not met
                              </div>
                            </div>
                          )}

                          {listing.status === 'listed' && (
                            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                              <div className="text-sm text-blue-700 text-center">
                                Scheduled to start: {new Date(listing.startDateTime).toLocaleString()}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center">
                          <div className="text-center py-8">
                            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                              <Package className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Ready to be listed for auction
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions - Always at bottom */}
                    <div className="flex gap-2 mt-auto pt-4">
                      {!isListed ? (
                        <Button 
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsDialogOpen(true);
                          }}
                          className="w-full gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          List for Auction
                        </Button>
                      ) : (
                        <>
                          {listing.status !== 'active' && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleDeleteListing(listing)}
                              className="w-full gap-2 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete Listing
                            </Button>
                          )}
                          {listing.status === 'active' && (
                            <div className="w-full space-y-2">
                              {listing.totalBids > 0 ? (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleQuickCloseAuction(listing)}
                                  className="w-full gap-2 text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300 hover:bg-orange-50"
                                >
                                  <StopCircle className="h-4 w-4" />
                                  Quick Close Auction
                                </Button>
                              ) : (
                                <div className="w-full text-center py-2 text-sm text-muted-foreground">
                                  Auction is live - waiting for bids
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'No products match your current filters'
                : getAvailableProductsForListing().length === 0 
                  ? 'All your products are currently listed for auction. Create new products to list more auctions.'
                  : 'You haven\'t added any products yet'
              }
            </p>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/dashboard/products'}
            >
              {products.length === 0 ? 'Add Your First Product' : 'Manage Products'}
            </Button>
          </div>
        )}

        {/* Quick Close Confirmation Dialog */}
        <Dialog open={isCloseConfirmOpen} onOpenChange={setIsCloseConfirmOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <StopCircle className="h-5 w-5 text-orange-600" />
                Close Auction Early?
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to close this auction early? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            {listingToClose && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <h4 className="font-semibold mb-2">{listingToClose.productName}</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Current Bid:</span>
                      <span className="font-semibold">₹{listingToClose.currentBid.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Bids:</span>
                      <span>{listingToClose.totalBids}</span>
                    </div>
                    {listingToClose.highestBidderName && (
                      <div className="flex justify-between">
                        <span>Highest Bidder:</span>
                        <span className="font-semibold">{listingToClose.highestBidderName}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsCloseConfirmOpen(false);
                      setListingToClose(null);
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={confirmQuickClose}
                    disabled={isClosingAuction}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
                  >
                    {isClosingAuction ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Closing...
                      </>
                    ) : (
                      'Close Auction'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
};

export default ManageListings;