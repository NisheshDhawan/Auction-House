import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { User, Mail, Phone, MapPin, Edit2, Save, X, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  address?: string;
  profileType: 'buyer' | 'seller';
  avatar?: string;
}

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isSwitchingProfile, setIsSwitchingProfile] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    id: user?.id || '',
    email: user?.email || '',
    fullName: user?.fullName || '',
    phone: '',
    address: '',
    profileType: 'buyer',
    avatar: ''
  });
  const [editedProfile, setEditedProfile] = useState<UserProfile>(profile);

  useEffect(() => {
    // Load user profile data from localStorage or API
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
      const parsedProfile = JSON.parse(savedProfile);
      setProfile(parsedProfile);
      setEditedProfile(parsedProfile);
    }
  }, []);

  const handleSaveProfile = () => {
    // Save profile changes
    setProfile(editedProfile);
    localStorage.setItem('userProfile', JSON.stringify(editedProfile));
    setIsEditing(false);
    toast({
      title: "Profile Updated",
      description: "Your profile has been successfully updated.",
    });
  };

  const handleCancelEdit = () => {
    setEditedProfile(profile);
    setIsEditing(false);
  };

  const handleProfileTypeSwitch = async (checked: boolean) => {
    setIsSwitchingProfile(true);
    
    // 10 second loading simulation
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const newProfileType = checked ? 'seller' : 'buyer';
    const updatedProfile = { ...profile, profileType: newProfileType };
    
    setProfile(updatedProfile);
    setEditedProfile(updatedProfile);
    localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
    setIsSwitchingProfile(false);
    
    toast({
      title: "Profile Switched",
      description: `Successfully switched to ${newProfileType} profile.`,
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isSwitchingProfile) {
    return (
      <LoadingScreen 
        title="Switching Profile" 
        description="Please wait while we switch your profile..." 
      />
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold gradient-text mb-2">Profile Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

            {/* Profile Type Toggle */}
            <div className="glass-card p-6 hover-tilt">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Profile Type</h3>
                <Badge 
                  variant={profile.profileType === 'seller' ? 'default' : 'secondary'}
                  className={profile.profileType === 'seller' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}
                >
                  {profile.profileType.charAt(0).toUpperCase() + profile.profileType.slice(1)}
                </Badge>
              </div>
              <p className="text-muted-foreground mb-6">
                Switch between buyer and seller profiles to access different features
              </p>
              <div className="flex items-center justify-center space-x-6 p-4 glass-card rounded-lg">
                <div className={`flex items-center space-x-2 transition-colors ${profile.profileType === 'buyer' ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                  <div className={`w-3 h-3 rounded-full transition-colors ${profile.profileType === 'buyer' ? 'bg-primary glow-effect' : 'bg-muted'}`}></div>
                  <Label htmlFor="profile-type" className="cursor-pointer">Buyer</Label>
                </div>
                <Switch
                  id="profile-type"
                  checked={profile.profileType === 'seller'}
                  onCheckedChange={handleProfileTypeSwitch}
                />
                <div className={`flex items-center space-x-2 transition-colors ${profile.profileType === 'seller' ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                  <div className={`w-3 h-3 rounded-full transition-colors ${profile.profileType === 'seller' ? 'bg-primary glow-effect' : 'bg-muted'}`}></div>
                  <Label htmlFor="profile-type" className="cursor-pointer">Seller</Label>
                </div>
              </div>
            </div>

            {/* Profile Information */}
            <div className="glass-card p-6 hover-tilt">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Profile Information</h3>
                {!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="border-primary/20 hover:border-primary/40"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      className="border-muted-foreground/20 hover:border-muted-foreground/40"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveProfile}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center space-x-4">
                  <Avatar className="h-20 w-20 border-2 border-primary/20">
                    <AvatarImage src={profile.avatar} />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">
                      {getInitials(profile.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">{profile.fullName}</h3>
                    <p className="text-muted-foreground">{profile.email}</p>
                  </div>
                </div>

                <Separator className="bg-border/50" />

                {/* Profile Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="flex items-center text-muted-foreground">
                      <User className="h-4 w-4 mr-2" />
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      value={isEditing ? editedProfile.fullName : profile.fullName}
                      onChange={(e) => setEditedProfile({ ...editedProfile, fullName: e.target.value })}
                      disabled={!isEditing}
                      className="bg-background/50 border-border/50 focus:border-primary/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center text-muted-foreground">
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={isEditing ? editedProfile.email : profile.email}
                      onChange={(e) => setEditedProfile({ ...editedProfile, email: e.target.value })}
                      disabled={!isEditing}
                      className="bg-background/50 border-border/50 focus:border-primary/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center text-muted-foreground">
                      <Phone className="h-4 w-4 mr-2" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      value={isEditing ? editedProfile.phone : profile.phone}
                      onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Enter your phone number"
                      className="bg-background/50 border-border/50 focus:border-primary/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="flex items-center text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2" />
                      Address
                    </Label>
                    <Input
                      id="address"
                      value={isEditing ? editedProfile.address : profile.address}
                      onChange={(e) => setEditedProfile({ ...editedProfile, address: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Enter your address"
                      className="bg-background/50 border-border/50 focus:border-primary/50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Type Specific Features */}
            <div className="glass-card p-6 hover-tilt">
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">
                  {profile.profileType === 'seller' ? '🏪 Seller Features' : '🛒 Buyer Features'}
                </h3>
                <p className="text-muted-foreground">
                  {profile.profileType === 'seller' 
                    ? 'Manage your products, orders, and seller dashboard'
                    : 'Browse products, manage orders, and track purchases'
                  }
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.profileType === 'seller' ? (
                  <>
                    <Button variant="outline" className="justify-start h-12 border-primary/20 hover:border-primary/40 hover:bg-primary/5">
                      📦 Manage Products
                    </Button>
                    <Button variant="outline" className="justify-start h-12 border-primary/20 hover:border-primary/40 hover:bg-primary/5">
                      📋 View Orders
                    </Button>
                    <Button variant="outline" className="justify-start h-12 border-primary/20 hover:border-primary/40 hover:bg-primary/5">
                      📊 Sales Analytics
                    </Button>
                    <Button variant="outline" className="justify-start h-12 border-primary/20 hover:border-primary/40 hover:bg-primary/5">
                      ⚙️ Store Settings
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" className="justify-start h-12 border-primary/20 hover:border-primary/40 hover:bg-primary/5">
                      📜 Order History
                    </Button>
                    <Button variant="outline" className="justify-start h-12 border-primary/20 hover:border-primary/40 hover:bg-primary/5">
                      ❤️ Wishlist
                    </Button>
                    <Button variant="outline" className="justify-start h-12 border-primary/20 hover:border-primary/40 hover:bg-primary/5">
                      📍 Track Orders
                    </Button>
                    <Button variant="outline" className="justify-start h-12 border-primary/20 hover:border-primary/40 hover:bg-primary/5">
                      💳 Payment Methods
                    </Button>
                  </>
                )}
              </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;