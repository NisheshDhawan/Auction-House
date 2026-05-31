import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getUserById, updateUser, type AdminUser } from '@/services/adminAPI';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, Mail } from 'lucide-react';

interface EditUserDialogProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: (updatedUser: AdminUser) => void;
}

const EditUserDialog = ({ userId, isOpen, onClose, onUserUpdated }: EditUserDialogProps) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'user' as 'user' | 'admin'
  });
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
      setFormData({
        full_name: userData.full_name,
        email: userData.email,
        role: userData.role
      });
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

  const handleSave = async () => {
    if (!userId || !user) return;

    try {
      setSaving(true);
      await updateUser(userId, formData);
      
      const updatedUser = { ...user, ...formData };
      onUserUpdated(updatedUser);
      
      toast({
        title: 'Success',
        description: 'User updated successfully.',
      });
      onClose();
    } catch (error) {
      console.error('Failed to update user:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setUser(null);
    setFormData({ full_name: '', email: '', role: 'user' });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information and permissions.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : user ? (
          <div className="grid gap-4 py-4">
            {/* User Info */}
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-semibold text-primary">
                    {user.full_name.split(' ').map(n => n[0]).join('')}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{user.full_name}</span>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
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

            {/* Edit Form */}
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: 'user' | 'admin') => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserDialog;