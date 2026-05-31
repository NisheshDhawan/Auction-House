import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CategoryRequestsManager from '@/components/admin/CategoryRequestsManager';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  FolderOpen, 
  MessageSquare, 
  Edit,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { getAllCategories, getAllCategoryRequests, type AdminCategory, type AdminCategoryRequest } from '@/services/adminAPI';
import { useToast } from '@/hooks/use-toast';
import EditCategoryDialog from '@/components/admin/EditCategoryDialog';
import DeleteCategoryDialog from '@/components/admin/DeleteCategoryDialog';
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

const AdminCategories = () => {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [categoryRequests, setCategoryRequests] = useState<AdminCategoryRequest[]>([]);
  const [activeTab, setActiveTab] = useState('categories');
  const [isLoading, setIsLoading] = useState(true);
  
  // Dialog states
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<AdminCategory | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  const { toast } = useToast();

  // Fetch real data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('AdminCategories: Starting to fetch data...');
        setIsLoading(true);
        
        console.log('AdminCategories: Calling getAllCategories...');
        const categoriesData = await getAllCategories();
        console.log('AdminCategories: Categories received:', categoriesData);
        
        console.log('AdminCategories: Calling getAllCategoryRequests...');
        const requestsData = await getAllCategoryRequests();
        console.log('AdminCategories: Requests received:', requestsData);
        
        setCategories(categoriesData);
        setCategoryRequests(requestsData);
        
        console.log('AdminCategories: Data set successfully');
      } catch (error) {
        console.error('AdminCategories: Failed to fetch categories data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load categories data. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
        console.log('AdminCategories: Loading finished');
      }
    };

    fetchData();
  }, [toast]);

  const handleCategoryAction = (categoryId: string, action: string) => {
    const category = categories.find(c => c.id === categoryId);
    
    switch (action) {
      case 'edit':
        setEditCategoryId(categoryId);
        break;
      case 'delete':
        if (category) setDeleteCategory(category);
        break;
      default:
        console.log(`Action ${action} for category ${categoryId}`);
    }
  };

  const handleCategoryUpdated = (updatedCategory: AdminCategory) => {
    setCategories(categories.map(category => 
      category.id === updatedCategory.id ? updatedCategory : category
    ));
  };

  const handleCategoryCreated = async (newCategory?: AdminCategory) => {
    console.log('handleCategoryCreated called with:', newCategory);
    if (newCategory && newCategory.id) {
      // If we have the new category data, add it to the list
      console.log('Adding new category to list:', newCategory);
      setCategories(prevCategories => [newCategory, ...prevCategories]);
    } else {
      // Fallback: refresh the entire categories list
      console.log('Refreshing entire categories list...');
      try {
        const [categoriesData, requestsData] = await Promise.all([
          getAllCategories(),
          getAllCategoryRequests()
        ]);
        
        console.log('Refreshed categories:', categoriesData);
        setCategories(categoriesData);
        setCategoryRequests(requestsData);
      } catch (error) {
        console.error('Failed to refresh categories data:', error);
        toast({
          title: 'Error',
          description: 'Failed to refresh categories data. Please try again.',
          variant: 'destructive'
        });
      }
    }
  };

  const handleCategoryDeleted = (categoryId: string) => {
    setCategories(categories.filter(category => category.id !== categoryId));
  };

  const pendingRequestsCount = categoryRequests.filter(req => req.status === 'pending').length;

  return (
    <div className="space-y-6 mt-20">
      {/* Header */}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Categories</p>
                <p className="text-2xl font-bold">{categories.length}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <FolderOpen className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold">{categoryRequests.length}</p>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <MessageSquare className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Requests</p>
                <p className="text-2xl font-bold">{pendingRequestsCount}</p>
              </div>
              <div className="p-2 bg-yellow-50 rounded-lg">
                <MessageSquare className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Categories ({categories.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Requests
            {pendingRequestsCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                {pendingRequestsCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Product Categories</CardTitle>
                  <CardDescription>
                    Manage existing product categories
                  </CardDescription>
                </div>
                <Button 
                  className="flex items-center gap-2"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add Category
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="h-4 bg-muted rounded w-1/4 animate-pulse"></div>
                      <div className="h-4 bg-muted rounded w-1/6 animate-pulse"></div>
                      <div className="h-4 bg-muted rounded w-1/6 animate-pulse"></div>
                      <div className="h-4 bg-muted rounded w-1/6 animate-pulse"></div>
                      <div className="h-4 bg-muted rounded w-1/12 animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.length > 0 ? (
                      categories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{category.name}</div>
                              {category.description && (
                                <div className="text-sm text-gray-500">
                                  {category.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {category.users?.full_name || 'System'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(category.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(category.updated_at).toLocaleDateString()}
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
                                <DropdownMenuItem onClick={() => handleCategoryAction(category.id, 'view')}>
                                  View Products
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCategoryAction(category.id, 'edit')}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Category
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleCategoryAction(category.id, 'delete')}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Category
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="text-muted-foreground">
                            No categories found. Create your first category to get started.
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <CategoryRequestsManager />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <EditCategoryDialog
        categoryId={editCategoryId}
        isOpen={!!editCategoryId}
        onClose={() => setEditCategoryId(null)}
        onCategoryUpdated={handleCategoryUpdated}
        mode="edit"
      />

      <EditCategoryDialog
        categoryId={null}
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCategoryUpdated={(newCategory) => handleCategoryCreated(newCategory)}
        mode="create"
      />

      <DeleteCategoryDialog
        category={deleteCategory}
        isOpen={!!deleteCategory}
        onClose={() => setDeleteCategory(null)}
        onCategoryDeleted={handleCategoryDeleted}
      />
    </div>
  );
};

export default AdminCategories;