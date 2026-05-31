import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getUserById, type AdminUser } from '@/services/adminAPI';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  CheckCircle, 
  Mail, 
  Calendar, 
  Shield, 
  User,
  Clock,
  Edit
} from 'lucide-react';

interface UserDetailsDialogProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (userId: string) => void;
}

const UserDetailsDialog = ({ userId, isOpen, onClose, onEdit }: UserDetailsDialogProps) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (userId && isOpen) {
      fetchUser();
    }
  }, [userId, isOpen]);

  const fetchUser = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const userData = await getUserById(userId);
      setUser(userData);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user details.',
        variant: 'destructive'
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setUser(null);
    onClose();
  };

  const handleEdit = () => {
    if (userId) {
      onEdit(userId);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
          <DialogDescription>
            View detailed information about this user account.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : user ? (
          <div className="space-y-6">
            {/* User Profile */}
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-semibold text-primary">
                    {user.full_name.split(' ').map(n => n[0]).join('')}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold">{user.full_name}</h3>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role === 'admin' ? (
                      <><Shield className="w-3 h-3 mr-1" />Admin</>
                    ) : (
                      <><User className="w-3 h-3 mr-1" />User</>
                    )}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
              </div>
            </div>

            {/* Account Status */}
            <div className="space-y-3">
              <h4 className="font-medium">Account Status</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 p-3 bg-background border rounded-lg">
                  {user.email_verified ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <div className="text-sm font-medium">Email Verified</div>
                        <div className="text-xs text-muted-foreground">Account is verified</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 text-yellow-500" />
                      <div>
                        <div className="text-sm font-medium">Email Unverified</div>
                        <div className="text-xs text-muted-foreground">Pending verification</div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 p-3 bg-background border rounded-lg">
                  {user.role === 'admin' ? (
                    <>
                      <Shield className="h-4 w-4 text-purple-500" />
                      <div>
                        <div className="text-sm font-medium">Administrator</div>
                        <div className="text-xs text-muted-foreground">Full access</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4 text-blue-500" />
                      <div>
                        <div className="text-sm font-medium">Regular User</div>
                        <div className="text-xs text-muted-foreground">Standard access</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Account Information */}
            <div className="space-y-3">
              <h4 className="font-medium">Account Information</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Joined</span>
                  </div>
                  <span className="text-sm font-medium">
                    {new Date(user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Last Updated</span>
                  </div>
                  <span className="text-sm font-medium">
                    {new Date(user.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>User ID</span>
                  </div>
                  <span className="text-sm font-mono text-muted-foreground">
                    {user.id.substring(0, 8)}...
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit User
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default UserDetailsDialog;