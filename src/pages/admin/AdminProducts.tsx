import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Search, 
  MoreHorizontal, 
  Package, 
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getAllProducts, deleteProduct, updateProduct, type AdminProduct } from '@/services/adminAPI';
import { useToast } from '@/hooks/use-toast';

const AdminProducts = () => {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'pending' | 'rejected'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Helper function to safely format dates
  const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error, 'for date:', dateString);
      return 'Invalid Date';
    }
  };

  // Fetch real data from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const productsData = await getAllProducts();
        setProducts(productsData);
      } catch (error) {
        console.error('Failed to fetch products:', error);
        setProducts([]);
        toast({
          title: 'Error',
          description: 'Failed to load products. Please check the console for details.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [toast]);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.categories?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.users?.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || product.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-600 text-white hover:bg-green-700';
      case 'inactive':
        return 'bg-gray-600 text-white hover:bg-gray-700';
      case 'pending':
        return 'bg-yellow-600 text-white hover:bg-yellow-700';
      case 'rejected':
        return 'bg-red-600 text-white hover:bg-red-700';
      default:
        return 'bg-gray-600 text-white hover:bg-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'inactive':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const handleProductAction = async (productId: string, action: string, newStatus?: string) => {
    try {
      switch (action) {
        case 'view':
          toast({
            title: 'Info',
            description: 'View product details - Coming soon!',
          });
          break;
        case 'edit':
          toast({
            title: 'Info',
            description: 'Edit product - Coming soon!',
          });
          break;
        case 'updateStatus':
          if (newStatus) {
            await updateProduct(productId, { status: newStatus as any });
            
            // Update local state
            setProducts(products.map(product => 
              product.id === productId 
                ? { ...product, status: newStatus as any }
                : product
            ));
            
            toast({
              title: 'Success',
              description: `Product status updated to ${newStatus}.`,
            });
          }
          break;
        case 'delete':
          if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
            await deleteProduct(productId);
            setProducts(products.filter(product => product.id !== productId));
            toast({
              title: 'Success',
              description: 'Product deleted successfully.',
            });
          }
          break;
        default:
          console.log(`Action ${action} for product ${productId}`);
      }
    } catch (error) {
      console.error(`Failed to ${action} product:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${action} product. Please try again.`,
        variant: 'destructive'
      });
    }
  };

  const refreshProducts = async () => {
    try {
      setIsLoading(true);
      const productsData = await getAllProducts();
      setProducts(productsData);
      toast({
        title: 'Success',
        description: 'Products refreshed successfully.',
      });
    } catch (error) {
      console.error('Failed to refresh products:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh products. Please try again.',
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
   
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Products</p>
                <p className="text-2xl font-bold">{products.filter(p => p.status === 'active').length}</p>
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
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold">{products.filter(p => p.status === 'pending').length}</p>
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
                <p className="text-sm text-gray-600">Inactive Products</p>
                <p className="text-2xl font-bold">{products.filter(p => p.status === 'inactive').length}</p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <XCircle className="h-5 w-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle>Products Management</CardTitle>
              <CardDescription>Manage product listings and their status</CardDescription>
            </div>
            <Button onClick={refreshProducts} variant="outline" size="sm" disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
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
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Package className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {product.description}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {product.users?.full_name.split(' ').map(n => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">{product.users?.full_name || 'Unknown'}</div>
                          <div className="text-xs text-gray-500">{product.users?.email || 'No email'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.categories?.name || 'Uncategorized'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(product.status)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className={`${getStatusColor(product.status)} cursor-pointer border-0 font-medium`}
                            >
                              {product.status}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {product.status !== 'active' && (
                              <DropdownMenuItem 
                                onClick={() => handleProductAction(product.id, 'updateStatus', 'active')}
                                className="text-green-600"
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Active
                              </DropdownMenuItem>
                            )}
                            {product.status !== 'inactive' && (
                              <DropdownMenuItem 
                                onClick={() => handleProductAction(product.id, 'updateStatus', 'inactive')}
                                className="text-gray-600"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Inactive
                              </DropdownMenuItem>
                            )}
                            {product.status !== 'pending' && (
                              <DropdownMenuItem 
                                onClick={() => handleProductAction(product.id, 'updateStatus', 'pending')}
                                className="text-yellow-600"
                              >
                                <Clock className="mr-2 h-4 w-4" />
                                Pending
                              </DropdownMenuItem>
                            )}
                            {product.status !== 'rejected' && (
                              <DropdownMenuItem 
                                onClick={() => handleProductAction(product.id, 'updateStatus', 'rejected')}
                                className="text-red-600"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Rejected
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(product.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(product.updated_at)}
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
                          <DropdownMenuItem onClick={() => handleProductAction(product.id, 'view')}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleProductAction(product.id, 'edit')}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Product
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                          {product.status !== 'active' && (
                            <DropdownMenuItem 
                              onClick={() => handleProductAction(product.id, 'updateStatus', 'active')}
                              className="text-green-600"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark as Active
                            </DropdownMenuItem>
                          )}
                          {product.status !== 'inactive' && (
                            <DropdownMenuItem 
                              onClick={() => handleProductAction(product.id, 'updateStatus', 'inactive')}
                              className="text-gray-600"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Mark as Inactive
                            </DropdownMenuItem>
                          )}
                          {product.status !== 'pending' && (
                            <DropdownMenuItem 
                              onClick={() => handleProductAction(product.id, 'updateStatus', 'pending')}
                              className="text-yellow-600"
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              Mark as Pending
                            </DropdownMenuItem>
                          )}
                          {product.status !== 'rejected' && (
                            <DropdownMenuItem 
                              onClick={() => handleProductAction(product.id, 'updateStatus', 'rejected')}
                              className="text-red-600"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Mark as Rejected
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleProductAction(product.id, 'delete')}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Product
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {searchTerm || filterStatus !== 'all' 
                        ? 'No products found matching your criteria.' 
                        : 'No products found. Products will appear here once they are created.'}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminProducts;