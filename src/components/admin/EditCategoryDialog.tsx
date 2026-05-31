import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getCategoryById, updateCategory, createCategory, type AdminCategory } from '@/services/adminAPI';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FolderOpen } from 'lucide-react';

interface EditCategoryDialogProps {
  categoryId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCategoryUpdated: (category: AdminCategory) => void;
  mode: 'edit' | 'create';
}

const EditCategoryDialog = ({ categoryId, isOpen, onClose, onCategoryUpdated, mode }: EditCategoryDialogProps) => {
  const [category, setCategory] = useState<AdminCategory | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && categoryId) {
        fetchCategory();
      } else if (mode === 'create') {
        setFormData({ name: '', description: '' });
      }
    }
  }, [categoryId, isOpen, mode]);

  const fetchCategory = async () => {
    if (!categoryId) return;
    
    try {
      setLoading(true);
      const categoryData = await getCategoryById(categoryId);
      setCategory(categoryData);
      setFormData({
        name: categoryData.name,
        description: categoryData.description || ''
      });
    } catch (error) {
      console.error('Failed to fetch category:', error);
      toast({
        title: 'Error',
        description: 'Failed to load category details.',
        variant: 'destructive'
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Category name is required.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);
      
      if (mode === 'edit' && categoryId) {
        await updateCategory(categoryId, formData);
        const updatedCategory = { ...category!, ...formData };
        onCategoryUpdated(updatedCategory);
        toast({
          title: 'Success',
          description: 'Category updated successfully.',
        });
      } else if (mode === 'create') {
        console.log('Creating category with data:', formData);
        const newCategory = await createCategory(formData);
        console.log('Category created, received:', newCategory);
        // For create mode, we call the callback to trigger refresh
        // The callback function will handle refreshing the categories list
        onCategoryUpdated(newCategory);
        toast({
          title: 'Success',
          description: 'Category created successfully.',
        });
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to save category:', error);
      toast({
        title: 'Error',
        description: `Failed to ${mode} category. Please try again.`,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setCategory(null);
    setFormData({ name: '', description: '' });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Edit Category' : 'Create Category'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' 
              ? 'Update category information.' 
              : 'Create a new category for products.'
            }
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            {mode === 'edit' && category && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <FolderOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{category.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Created {new Date(category.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Category Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter category name"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter category description (optional)"
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'edit' ? 'Save Changes' : 'Create Category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditCategoryDialog;