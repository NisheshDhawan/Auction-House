import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { productsAPI, Product, Category } from '@/services/productsAPI';
import { uploadImage as uploadImageService, validateImageFile, createImagePreview } from '@/services/imageUpload';
import { getImageUrl } from '@/services/localImageStorage';
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSuccess: () => void;
}

interface ProductFormData {
  name: string;
  description: string;
  basePrice: string;
  category: string;
  image: string;
}

const ProductForm = ({ open, onOpenChange, product, onSuccess }: ProductFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    basePrice: '',
    category: '',
    image: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // Load categories when component mounts
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesData = await productsAPI.getCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };
    
    if (open) {
      loadCategories();
    }
  }, [open]);

  // Populate form when editing
  useEffect(() => {
    const loadProductData = async () => {
      if (product) {
        setFormData({
          name: product.name,
          description: product.description || '',
          basePrice: product.basePrice.toString(),
          category: product.category, // This is now a UUID
          image: product.image || ''
        });
        
        // Load image URL if we have an image ID
        if (product.image) {
          try {
            const url = await getImageUrl(product.image);
            setImagePreview(url || '');
          } catch (error) {
            console.error('Failed to load product image:', error);
            setImagePreview('');
          }
        } else {
          setImagePreview('');
        }
      } else {
        setFormData({
          name: '',
          description: '',
          basePrice: '',
          category: '',
          image: ''
        });
        setImagePreview('');
      }
      setImageFile(null);
      setPreviewUrl('');
    };

    if (open) {
      loadProductData();
    }
  }, [product, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Product name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.category) {
      toast({
        title: "Validation Error",
        description: "Please select a category",
        variant: "destructive",
      });
      return;
    }

    const basePrice = parseFloat(formData.basePrice);
    if (isNaN(basePrice) || basePrice <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid base price",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      let imageUrl = formData.image;

      // Upload new image if selected
      if (imageFile) {
        const uploadResult = await uploadImageService(imageFile);
        if (uploadResult.success) {
          imageUrl = uploadResult.url; // This is now a base64 data URL
        } else {
          toast({
            title: "Image Upload Failed",
            description: uploadResult.error || "Failed to upload image. Product will be created without image.",
            variant: "destructive",
          });
          imageUrl = '';
        }
      }

      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        basePrice: basePrice,
        category: formData.category,
        image: imageUrl,
        userId: user?.id || '',
        userName: user?.fullName || 'Unknown User'
      };

      if (product) {
        // Update existing product
        await productsAPI.updateProduct(product.id, productData);
        toast({
          title: "Product Updated",
          description: "Product has been successfully updated",
        });
      } else {
        // Create new product
        await productsAPI.createProduct(productData);
        toast({
          title: "Product Created",
          description: "Product has been successfully created",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: product ? "Update Failed" : "Creation Failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProductFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file
      const validation = validateImageFile(file);
      if (!validation.valid) {
        toast({
          title: "Invalid File",
          description: validation.error,
          variant: "destructive",
        });
        return;
      }

      setImageFile(file);
      
      // Create preview URL for immediate display
      try {
        const preview = await createImagePreview(file);
        setImagePreview(preview);
        setPreviewUrl(preview);
      } catch (error) {
        toast({
          title: "Preview Error",
          description: "Failed to create image preview",
          variant: "destructive",
        });
      }
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setPreviewUrl('');
    setFormData(prev => ({ ...prev, image: '' }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? 'Edit Product' : 'Add New Product'}
          </DialogTitle>
          <DialogDescription>
            {product 
              ? 'Update the product details below.'
              : 'Fill in the details to create a new product.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter product name"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter product description"
              disabled={isLoading}
              rows={3}
            />
          </div>

          {/* Image Upload Section */}
          <div className="space-y-2">
            <Label>Product Image</Label>
            
            {imagePreview ? (
              <div className="relative">
                <div className="w-full h-48 border-2 border-dashed border-border rounded-lg overflow-hidden bg-gray-50">
                  <img
                    src={imagePreview}
                    alt="Product preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Image preview failed to load:', imagePreview);
                      // If image fails to load, remove the preview
                      setImagePreview('');
                      toast({
                        title: "Image Error",
                        description: "Failed to display image preview",
                        variant: "destructive",
                      });
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={removeImage}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="w-full h-48 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                  disabled={isLoading}
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer flex flex-col items-center justify-center p-6 text-center"
                >
                  <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm font-medium mb-2">Upload Product Image</p>
                  <p className="text-xs text-muted-foreground">
                    Click to select or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, GIF up to 5MB
                  </p>
                </label>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="basePrice">Base Price (₹) *</Label>
            <Input
              id="basePrice"
              type="number"
              step="1"
              min="0"
              value={formData.basePrice}
              onChange={(e) => handleInputChange('basePrice', e.target.value)}
              placeholder="0"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              This is the starting price for the auction
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => handleInputChange('category', value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {product ? 'Update Product' : 'Create Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductForm;