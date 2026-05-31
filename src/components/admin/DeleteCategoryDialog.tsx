import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { deleteCategory, type AdminCategory } from '@/services/adminAPI';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, FolderOpen } from 'lucide-react';

interface DeleteCategoryDialogProps {
  category: AdminCategory | null;
  isOpen: boolean;
  onClose: () => void;
  onCategoryDeleted: (categoryId: string) => void;
}

const DeleteCategoryDialog = ({ category, isOpen, onClose, onCategoryDeleted }: DeleteCategoryDialogProps) => {
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!category) return;

    try {
      setDeleting(true);
      await deleteCategory(category.id);
      
      onCategoryDeleted(category.id);
      toast({
        title: 'Success',
        description: `Category "${category.name}" has been deleted successfully.`,
      });
      onClose();
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete category. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!category) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle>Delete Category</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the category.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {/* Category Info */}
        <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <FolderOpen className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-lg">{category.name}</div>
            {category.description && (
              <div className="text-sm text-muted-foreground mt-1">
                {category.description}
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-2">
              Created {new Date(category.created_at).toLocaleDateString()}
              {category.users?.full_name && ` by ${category.users.full_name}`}
            </div>
          </div>
        </div>

        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-destructive mb-1">Warning</p>
              <p className="text-muted-foreground">
                Deleting this category will permanently remove it from the system. 
                Any products associated with this category may be affected.
              </p>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Category
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteCategoryDialog;