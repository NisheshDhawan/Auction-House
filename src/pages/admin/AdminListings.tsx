import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Calendar,
  User,
  Edit,
  Trash2,
  Play,
  Square
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getAllListings, deleteListing, updateListingStatus, type AdminListing } from '@/services/adminAPI';
import { useToast } from '@/hooks/use-toast';

const AdminListings = () => {
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'active' | 'ended' | 'cancelled'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [viewingListing, setViewingListing] = useState<AdminListing | null>(null);
  const { toast } = useToast();

  // Fetch real data from API
  useEffect(() => {
    const fetchListings = async () => {
      try {
        setIsLoading(true);
        const listingsData = await getAllListings();
        setListings(listingsData);
      } catch (error) {
        console.error('Failed to fetch listings:', error);
        toast({
          title: 'Error',
          description: 'Failed to load listings. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchListings();
  }, [toast]);

  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         listing.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         listing.categories?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         listing.users?.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || listing.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'ended':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'draft':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'ended':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const handleListingAction = async (listingId: string, action: string) => {
    try {
      switch (action) {
        case 'view':
          const listingToView = listings.find(l => l.id === listingId);
          if (listingToView) {
            setViewingListing(listingToView);
          }
          break;
        case 'edit':
          // TODO: Implement edit listing
          toast({
            title: 'Info',
            description: 'Edit listing - Coming soon!',
          });
          break;
        case 'activate':
          await updateListingStatus(listingId, 'active');
          setListings(listings.map(listing => 
            listing.id === listingId ? { ...listing, status: 'active' } : listing
          ));
          toast({
            title: 'Success',
            description: 'Listing activated successfully.',
          });
          break;
        case 'end':
          await updateListingStatus(listingId, 'ended');
          setListings(listings.map(listing => 
            listing.id === listingId ? { ...listing, status: 'ended' } : listing
          ));
          toast({
            title: 'Success',
            description: 'Listing ended successfully.',
          });
          break;
        case 'cancel':
          await updateListingStatus(listingId, 'cancelled');
          setListings(listings.map(listing => 
            listing.id === listingId ? { ...listing, status: 'cancelled' } : listing
          ));
          toast({
            title: 'Success',
            description: 'Listing cancelled successfully.',
          });
          break;
        case 'delete':
          if (confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
            await deleteListing(listingId);
            setListings(listings.filter(listing => listing.id !== listingId));
            toast({
              title: 'Success',
              description: 'Listing deleted successfully.',
            });
          }
          break;
        default:
          console.log(`Action ${action} for listing ${listingId}`);
      }
    } catch (error) {
      console.error(`Failed to ${action} listing:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${action} listing. Please try again.`,
        variant: 'destructive'
      });
    }
  };

  const refreshListings = async () => {
    try {
      setIsLoading(true);
      const listingsData = await getAllListings();
      setListings(listingsData);
      toast({
        title: 'Success',
        description: 'Listings refreshed successfully.',
      });
    } catch (error) {
      console.error('Failed to refresh listings:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh listings. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 mt-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshListings} disabled={isLoading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Listings</p>
                <p className="text-2xl font-bold">{listings.length}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Auctions</p>
                <p className="text-2xl font-bold">{listings.filter(l => l.status === 'active').length}</p>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Draft Listings</p>
                <p className="text-2xl font-bold">{listings.filter(l => l.status === 'draft').length}</p>
              </div>
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ended Auctions</p>
                <p className="text-2xl font-bold">{listings.filter(l => l.status === 'ended').length}</p>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search listings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="ended">Ended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Listing</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Starting Bid</TableHead>
                <TableHead>Current Bid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredListings.length > 0 ? (
                filteredListings.map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <button 
                          className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors border-none"
                          onClick={() => handleListingAction(listing.id, 'view')}
                          title="View Details"
                        >
                          <Eye className="h-5 w-5 text-gray-500" />
                        </button>
                        <div>
                          <div className="font-medium">{listing.title}</div>
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {listing.description}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {listing.users?.full_name.split(' ').map(n => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">{listing.users?.full_name || 'Unknown'}</div>
                          <div className="text-xs text-gray-500">{listing.users?.email || 'No email'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{listing.categories?.name || 'Uncategorized'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">₹{listing.starting_bid.toLocaleString()}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">₹{listing.current_bid.toLocaleString()}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(listing.status)}
                        <Badge className={getStatusColor(listing.status)}>
                          {listing.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(listing.end_time).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(listing.end_time).toLocaleTimeString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleListingAction(listing.id, 'view')}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleListingAction(listing.id, 'edit')}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Listing
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {listing.status === 'draft' && (
                            <DropdownMenuItem 
                              onClick={() => handleListingAction(listing.id, 'activate')}
                              className="text-green-600"
                            >
                              <Play className="mr-2 h-4 w-4" />
                              Activate Listing
                            </DropdownMenuItem>
                          )}
                          {listing.status === 'active' && (
                            <DropdownMenuItem 
                              onClick={() => handleListingAction(listing.id, 'end')}
                              className="text-orange-600"
                            >
                              <Square className="mr-2 h-4 w-4" />
                              End Auction
                            </DropdownMenuItem>
                          )}
                          {(listing.status === 'draft' || listing.status === 'active') && (
                            <DropdownMenuItem 
                              onClick={() => handleListingAction(listing.id, 'cancel')}
                              className="text-red-600"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancel Listing
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleListingAction(listing.id, 'delete')}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Listing
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {searchTerm || filterStatus !== 'all' 
                        ? 'No listings found matching your criteria.' 
                        : 'No listings found. Listings will appear here once they are created.'}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Listing Details Modal */}
      <Dialog open={!!viewingListing} onOpenChange={(open) => !open && setViewingListing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Listing Details</DialogTitle>
            <DialogDescription>
              Detailed information about this auction listing.
            </DialogDescription>
          </DialogHeader>
          
          {viewingListing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{viewingListing.title}</h3>
                  <p className="text-gray-600 mt-1">{viewingListing.description}</p>
                </div>
                
                <div className="space-y-3 bg-gray-50 p-4 rounded-lg border">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-500 font-medium">Status</span>
                    <Badge className={getStatusColor(viewingListing.status)}>
                      {viewingListing.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-500 font-medium">Category</span>
                    <Badge variant="outline">{viewingListing.categories?.name || 'Uncategorized'}</Badge>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-500 font-medium">Starting Bid</span>
                    <span className="font-medium text-lg">₹{viewingListing.starting_bid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-500 font-medium">Current Bid</span>
                    <span className="font-medium text-lg text-primary">₹{viewingListing.current_bid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-500 font-medium">End Date</span>
                    <span className="font-medium">{new Date(viewingListing.end_time).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Seller Information</h3>
                  <div className="bg-white p-4 rounded-lg border flex items-center gap-4">
                    <Avatar className="h-12 w-12 border">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {viewingListing.users?.full_name.split(' ').map((n: string) => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-lg truncate">{viewingListing.users?.full_name || 'Unknown'}</div>
                      <div className="text-gray-500 text-sm truncate">{viewingListing.users?.email}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {viewingListing.status === 'draft' && (
                      <Button 
                        onClick={() => {
                          handleListingAction(viewingListing.id, 'activate');
                          setViewingListing(null);
                        }}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <Play className="mr-2 h-4 w-4" /> Activate
                      </Button>
                    )}
                    {viewingListing.status === 'active' && (
                      <Button 
                        onClick={() => {
                          handleListingAction(viewingListing.id, 'end');
                          setViewingListing(null);
                        }}
                        className="w-full bg-orange-600 hover:bg-orange-700"
                      >
                        <Square className="mr-2 h-4 w-4" /> End Auction
                      </Button>
                    )}
                    {(viewingListing.status === 'draft' || viewingListing.status === 'active') && (
                      <Button 
                        onClick={() => {
                          handleListingAction(viewingListing.id, 'cancel');
                          setViewingListing(null);
                        }}
                        variant="destructive"
                        className="w-full"
                      >
                        <XCircle className="mr-2 h-4 w-4" /> Cancel
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      onClick={() => setViewingListing(null)}
                      className="col-span-full"
                    >
                      Close Details
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminListings;