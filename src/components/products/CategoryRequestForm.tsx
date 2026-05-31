import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { categoryRequestsAPI, CategoryRequestFormData } from '@/services/categoryRequestsAPI';
import { Loader2, Send } from 'lucide-react';

interface CategoryRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CategoryRequestForm = ({ open, onOpenChange, onSuccess }: CategoryRequestFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    reason: '',
    color: 'handmade' // Default to handmade type
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to submit a category request",
        variant: "destructive",
      });
      return;
    }

    // Validation
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    if (formData.name.trim().length < 2) {
      toast({
        title: "Validation Error",
        description: "Category name must be at least 2 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const requestData: CategoryRequestFormData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        reason: formData.reason.trim(),
        color: formData.color,
        requestedBy: user.id,
        requestedByName: user.fullName || 'Unknown User',
        requestedByEmail: user.email || 'unknown@email.com'
      };

      await categoryRequestsAPI.submitCategoryRequest(requestData);
      
      toast({
        title: "Request Submitted",
        description: "Your category request has been submitted for admin review. You'll receive an email notification once it's reviewed.",
      });

      // Reset form
      setFormData({
        name: '',
        description: '',
        reason: '',
        color: 'handmade'
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit category request",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto glass-card border-border/50">
        <DialogHeader>
          <DialogTitle className="gradient-text text-xl font-serif">Request New Category</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Submit a request for a new product category. An admin will review your request and notify you via email.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Category Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter category name"
              disabled={isLoading}
              maxLength={50}
              className="bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20"
            />
            <p className="text-xs text-muted-foreground">
              Choose a clear, descriptive name for the category
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe what products belong in this category"
              disabled={isLoading}
              rows={3}
              maxLength={200}
              className="bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Optional: Help others understand what products fit in this category
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason for Request
            </Label>
            <Textarea
              id="reason"
              value={formData.reason || ''}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              placeholder="Why do you need this category? What products would you list under it?"
              disabled={isLoading}
              rows={2}
              maxLength={300}
              className="bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Optional: Explain why this category would be useful
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color" className="text-sm font-medium">
              Category Type
            </Label>
            <div className="grid grid-cols-1 gap-2">
              <Button
                type="button"
                variant={formData.color === 'handmade' ? 'default' : 'outline'}
                onClick={() => handleInputChange('color', 'handmade')}
                disabled={isLoading}
                className="justify-start gap-3 h-12"
              >
                <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                <div className="text-left">
                  <div className="font-medium">🖐️ Handmade Crafts</div>
                  <div className="text-xs text-muted-foreground">Physical crafts made by hand</div>
                </div>
              </Button>
              <Button
                type="button"
                variant={formData.color === 'digital' ? 'default' : 'outline'}
                onClick={() => handleInputChange('color', 'digital')}
                disabled={isLoading}
                className="justify-start gap-3 h-12"
              >
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                <div className="text-left">
                  <div className="font-medium">💻 Digital Crafts</div>
                  <div className="text-xs text-muted-foreground">Digital art and creations</div>
                </div>
              </Button>
              <Button
                type="button"
                variant={formData.color === 'general' ? 'default' : 'outline'}
                onClick={() => handleInputChange('color', 'general')}
                disabled={isLoading}
                className="justify-start gap-3 h-12"
              >
                <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                <div className="text-left">
                  <div className="font-medium">🎨 General Category</div>
                  <div className="text-xs text-muted-foreground">Other types of products</div>
                </div>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Choose the type that best describes your category
            </p>
          </div>

          <div className="glass-card p-4 border-primary/20 bg-primary/5">
            <h4 className="font-medium text-primary mb-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              Review Process
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-accent"></div>
                Your request will be reviewed by an admin
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-accent"></div>
                If approved, the category will be available immediately
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-accent"></div>
                Only admins can edit or delete approved categories
              </li>
            </ul>
          </div>

          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="border-border/50 hover:bg-muted/50"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              onClick={handleSubmit}
              className="bg-primary hover:bg-primary/90 text-primary-foreground glow-effect"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Send className="mr-2 h-4 w-4" />
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryRequestForm;