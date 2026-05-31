import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { deleteUser, type AdminUser } from '@/services/adminAPI';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, CheckCircle, Mail } from 'lucide-react';

interface DeleteUserDialogProps {
  user: AdminUser | null;
  isOpen: boolean;
  onClose: () => void;
  onUserDeleted: (userId: string) => void;
}

const DeleteUserDialog = ({ user, isOpen, onClose, onUserDeleted }: DeleteUserDialogProps) => {
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!user) return;

    try {
      setDeleting(true);
      await deleteUser(user.id);
      
      onUserDeleted(user.id);
      toast({
        title: 'Success',
        description: `User ${user.full_name} has been deleted successfully.`,
      });
      onClose();
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete user. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle>Delete User</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the user account.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {/* User Info */}
        <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">
              {user.full_name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">{user.full_name}</span>
              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                {user.role}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              {user.email_verified ? (
                <>
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Verified</span>
                </>
              ) : (
                <>
                  <Mail className="h-3 w-3 text-yellow-500" />
                  <span>Unverified</span>
                </>
              )}
              <span>•</span>
              <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-destructive mb-1">Warning</p>
              <p className="text-muted-foreground">
                Deleting this user will permanently remove their account and all associated data. 
                This action cannot be undone.
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
            Delete User
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteUserDialog;