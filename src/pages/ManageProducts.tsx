import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProductForm from '@/components/products/ProductForm';
import CategoryRequestForm from '@/components/products/CategoryRequestForm';
import MyCategoryRequests from '@/components/products/MyCategoryRequests';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useToast } from '@/hooks/use-toast';
import { productsAPI, Product, Category } from '@/services/productsAPI';
import { 
  Plus, 
  Search, 
  Edit,
  Trash2,
  Package, 
  Tag,
  MoreHorizontal,
  Loader2,
  Filter
} from 'lucide-react';
import { ImageDisplay } from '@/components/ui/image-display';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ManageProducts = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Prevent admin users from accessing seller features
  if (user?.role === 'admin') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Package className="h-16 w-16 text-muted-foreground mx-auto" />
            <h2 className="text-2xl font-semibold">Access Restricted</h2>
            <p className="text-muted-foreground max-w-md">
              Admin users cannot create or manage products. This feature is only available for regular users who want to sell items.
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

  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showCategoryRequestForm, setShowCategoryRequestForm] = useState(false);
  const [categoryRequestFilter, setCategoryRequestFilter] = useState<string>('all');
  const [colorFilter, setColorFilter] = useState<string>('all');

  // Fetch products and categories
  const fetchData = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      
      // Fetch seller's products (user-specific)
      const productsResponse = await productsAPI.getSellerProducts(user.id, { 
        search: searchTerm || undefined,
        limit: 50 
      });
      
      // Fetch categories
      const categoriesData = await productsAPI.getCategories();

      // Update category product counts based on current products
      const updatedCategories = categoriesData.map(category => ({
        ...category,
        productCount: productsResponse.products.filter(p => p.category === category.name).length
      }));

      setProducts(productsResponse.products);
      setCategories(updatedCategories);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message || "Failed to load products and categories",
        variant: "destructive",
      });
      
      // Fallback to empty arrays
      setProducts([]);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id, searchTerm, toast]);

  // Handle adding new product
  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowProductForm(true);
  };

  // Handle editing product
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  // Handle product form success
  const handleProductFormSuccess = () => {
    fetchData(); // Refresh the data
  };

  // Handle product deletion
  const handleDeleteProduct = async (productId: string) => {
    try {
      setIsDeleting(productId);
      await productsAPI.deleteProduct(productId);
      
      // Remove from local state
      setProducts(products.filter(p => p.id !== productId));
      
      toast({
        title: "Product deleted",
        description: "Product has been successfully deleted",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting product",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const getCategoryType = (categoryName: string) => {
    const handmadeKeywords = ['pottery', 'jewelry', 'textiles', 'wood', 'paper', 'leather', 'metal', 'candles', 'knitting', 'paintings'];
    const digitalKeywords = ['digital', 'nft', 'graphic', 'photography', '3d', 'animation', 'web', 'patterns', 'templates'];
    
    const isHandmade = handmadeKeywords.some(keyword => categoryName.toLowerCase().includes(keyword));
    const isDigital = digitalKeywords.some(keyword => categoryName.toLowerCase().includes(keyword));
    
    if (isHandmade) return 'handmade';
    if (isDigital) return 'digital';
    return 'general';
  };

  const getCategoryColor = (categoryName: string) => {
    const type = getCategoryType(categoryName);
    switch (type) {
      case 'handmade':
        return 'bg-orange-500'; // Warm color for handmade crafts
      case 'digital':
        return 'bg-blue-500'; // Cool color for digital crafts
      default:
        return 'bg-purple-500'; // Neutral color for general categories
    }
  };

  const getCategoryColorName = (categoryName: string) => {
    const type = getCategoryType(categoryName);
    switch (type) {
      case 'handmade':
        return 'handmade';
      case 'digital':
        return 'digital';
      default:
        return 'general';
    }
  };

  const getFilteredCategories = () => {
    if (colorFilter === 'all') {
      return categories;
    }
    
    return categories.filter((category) => {
      const categoryType = getCategoryType(category.name);
      return categoryType === colorFilter;
    });
  };

  if (isLoading) {
    return <LoadingScreen title="Loading Products" description="Fetching your products and categories..." />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Manage Products</h1>
            <p className="text-muted-foreground mt-2">
              Manage your products and categories
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
              <Package className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        {/* Tabs for Products and Categories */}
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="category-requests" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              My Requests
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">My Products</h2>
                <p className="text-muted-foreground">Manage and organize your auction products</p>
              </div>
              <Button className="bg-primary hover:bg-primary/90" onClick={handleAddProduct}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>

            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.length > 0 ? products.map((product) => (
                <div key={product.id} className="glass-card p-6 hover-tilt">
                  <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg mb-4 overflow-hidden">
                    <ImageDisplay
                      imageId={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-lg"
                      fallbackClassName="w-full h-full flex items-center justify-center"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{product.name}</h3>
                        <p className="text-sm text-muted-foreground">{product.category}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isDeleting === product.id}>
                            {isDeleting === product.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold">₹{product.basePrice.toLocaleString('en-IN')}</span>
                        <p className="text-xs text-muted-foreground">Base Price</p>
                      </div>
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        Available
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Auction Item</span>
                      <span>ID: #{product.id.slice(-6)}</span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="col-span-full text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No products found</h3>
                  <p className="text-muted-foreground">Start by adding your first product</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Product Categories</h2>
                <p className="text-muted-foreground">Organize your products into categories</p>
              </div>
              <Button variant="outline" onClick={() => setShowCategoryRequestForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Request Category
              </Button>
            </div>

            {/* Color Filter */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filter by type:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={colorFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setColorFilter('all')}
                  className="h-8"
                >
                  All Categories
                </Button>
                <Button
                  variant={colorFilter === 'handmade' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setColorFilter('handmade')}
                  className="h-8 gap-2"
                >
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  🖐️ Handmade Crafts
                </Button>
                <Button
                  variant={colorFilter === 'digital' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setColorFilter('digital')}
                  className="h-8 gap-2"
                >
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  💻 Digital Crafts
                </Button>
                <Button
                  variant={colorFilter === 'general' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setColorFilter('general')}
                  className="h-8 gap-2"
                >
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  🎨 General
                </Button>
              </div>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getFilteredCategories().length > 0 ? getFilteredCategories().map((category) => {
                const categoryType = getCategoryType(category.name);
                return (
                  <div key={category.id} className="glass-card p-6 hover-tilt animate-fade-up">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-lg ${getCategoryColor(category.name)} flex items-center justify-center glow-effect`}>
                        <Tag className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{category.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {category.productCount} products
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <div className={`w-2 h-2 rounded-full ${getCategoryColor(category.name)}`}></div>
                          <span className="text-xs text-muted-foreground capitalize">
                            {categoryType === 'handmade' ? '🖐️ Handmade' : 
                             categoryType === 'digital' ? '💻 Digital' : 
                             '🎨 General'}
                          </span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setShowCategoryRequestForm(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Request New Category
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              }) : (
                <div className="col-span-full text-center py-12">
                  <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {colorFilter === 'all' ? 'No categories found' : 
                     colorFilter === 'handmade' ? 'No handmade craft categories found' :
                     colorFilter === 'digital' ? 'No digital craft categories found' :
                     'No general categories found'}
                  </h3>
                  <p className="text-muted-foreground">
                    {colorFilter === 'all' 
                      ? 'Start by adding your first category' 
                      : `Try selecting a different type or clear the filter`
                    }
                  </p>
                  {colorFilter !== 'all' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setColorFilter('all')}
                      className="mt-4"
                    >
                      Clear Filter
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
          {/* Category Requests Tab */}
          <TabsContent value="category-requests" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">My Category Requests</h2>
                <p className="text-muted-foreground">Track your submitted category requests</p>
              </div>
              <div className="flex items-center gap-4">
                <Select value={categoryRequestFilter} onValueChange={setCategoryRequestFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Requests</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <MyCategoryRequests filter={categoryRequestFilter} />
          </TabsContent>
        </Tabs>

        {/* Category Request Form Dialog */}
        <CategoryRequestForm
          open={showCategoryRequestForm}
          onOpenChange={setShowCategoryRequestForm}
          onSuccess={() => {
            // Optionally refresh data or show success message
            toast({
              title: "Request Submitted",
              description: "Your category request has been submitted for review",
            });
          }}
        />

        {/* Product Form Dialog */}
        <ProductForm
          open={showProductForm}
          onOpenChange={setShowProductForm}
          product={editingProduct}
          onSuccess={handleProductFormSuccess}
        />
      </div>
    </DashboardLayout>
  );
};

export default ManageProducts;