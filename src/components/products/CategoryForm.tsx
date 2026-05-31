import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { productsAPI, Category } from '@/services/productsAPI';
import { Loader2 } from 'lucide-react';

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  onSuccess: () => void;
}

interface CategoryFormData {
  name: string;
  description: string;
}

const CategoryForm = ({ open, onOpenChange, category, onSuccess }: CategoryFormProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: ''
  });

  // Populate form when editing
  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        description: category.description || ''
      });
    } else {
      setFormData({
        name: '',
        description: ''
      });
    }
  }, [category, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate category names (only for new categories)
    if (!category) {
      try {
        const existingCategories = await productsAPI.getCategories();
        const isDuplicate = existingCategories.some(
          cat => cat.name.toLowerCase() === formData.name.trim().toLowerCase()
        );
        
        if (isDuplicate) {
          toast({
            title: "Validation Error",
            description: "A category with this name already exists",
            variant: "destructive",
          });
          return;
        }
      } catch (error) {
        // If we can't check for duplicates, proceed anyway
        console.warn('Could not check for duplicate categories:', error);
      }
    }

    setIsLoading(true);

    try {
      const categoryData = {
        name: formData.name.trim(),
        description: formData.description.trim()
      };

      if (category) {
        // Update existing category
        await productsAPI.updateCategory(category.id, categoryData);
        toast({
          title: "Category Updated",
          description: "Category has been successfully updated",
        });
      } else {
        // Create new category
        await productsAPI.createCategory(categoryData);
        toast({
          title: "Category Created",
          description: "Category has been successfully created",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: category ? "Update Failed" : "Creation Failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof CategoryFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {category ? 'Edit Category' : 'Add New Category'}
          </DialogTitle>
          <DialogDescription>
            {category 
              ? 'Update the category details below.'
              : 'Fill in the details to create a new category.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter category name"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter category description"
              disabled={isLoading}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {category ? 'Update Category' : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryForm;