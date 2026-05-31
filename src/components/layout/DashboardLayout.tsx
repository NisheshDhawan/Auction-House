import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { 
  Menu, 
  Home, 
  Package, 
  ShoppingCart, 
  Users, 
  Settings, 
  LogOut,
  Gavel,
  History,
  CreditCard,
  List,
  FolderOpen,
  Hammer
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSwitchingProfile, setIsSwitchingProfile] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Get profile type from localStorage or default to buyer
  const savedProfile = localStorage.getItem('userProfile');
  const [profileType, setProfileType] = useState(savedProfile ? JSON.parse(savedProfile).profileType : 'buyer');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleProfileTypeSwitch = async (checked: boolean) => {
    setIsSwitchingProfile(true);
    
    // 10 second loading simulation
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const newProfileType = checked ? 'seller' : 'buyer';
    
    // Update local state
    setProfileType(newProfileType);
    
    // Update localStorage
    const currentProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const updatedProfile = { ...currentProfile, profileType: newProfileType };
    localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
    
    setIsSwitchingProfile(false);
    
    toast({
      title: "Profile Switched",
      description: `Successfully switched to ${newProfileType} profile.`,
    });

    // Navigate to dashboard to refresh the view
    if (location.pathname !== '/dashboard') {
      navigate('/dashboard');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const buyerNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'My Products', href: '/my-products', icon: FolderOpen },
    { name: 'Bid History', href: '/bid-history', icon: Hammer },
  ];

  const adminNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Admin Panel', href: '/admin', icon: Settings },
    { name: 'User Management', href: '/admin/users', icon: Users },
    { name: 'Bidding History', href: '/admin/bidding-history', icon: History },
  ];

  const sellerNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Manage Products', href: '/manage-products', icon: Package },
    { name: 'Manage Listings', href: '/manage-listings', icon: List },
    { name: 'My Sold Products', href: '/my-sold-products', icon: History },
    { name: 'Orders History', href: '/orders-history', icon: ShoppingCart },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Payment Settings', href: '/payment-settings', icon: CreditCard },
  ];

  // Determine navigation items based on user role
  const getNavItems = () => {
    if (user?.role === 'admin') {
      return adminNavItems;
    }
    return profileType === 'seller' ? sellerNavItems : buyerNavItems;
  };

  const navItems = getNavItems();

  // Show loading screen when switching profiles
  if (isSwitchingProfile) {
    return (
      <LoadingScreen 
        title="Switching Profile" 
        description="Please wait while we switch your profile..." 
      />
    );
  }

  const Sidebar = ({ mobile = false }) => (
    <div className={`flex flex-col h-full ${mobile ? 'p-4' : 'p-6'}`}>
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Gavel className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-serif font-bold">Auction House</span>
      </div>

      {/* Profile Type Switch - Hidden for admin users */}
      {user?.role !== 'admin' && (
        <div className="mb-6 p-3 glass-card rounded-lg">
          <div className="mb-3">
            <span className="text-sm text-muted-foreground">Mode</span>
          </div>
          
          {/* Mode Switch */}
          <div className="flex items-center justify-center space-x-3 p-2 bg-background/50 rounded-lg">
            <div className={`flex items-center space-x-1 text-xs ${profileType === 'buyer' ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-2 h-2 rounded-full ${profileType === 'buyer' ? 'bg-primary' : 'bg-muted'}`}></div>
              <span>Buyer</span>
            </div>
            <Switch
              checked={profileType === 'seller'}
              onCheckedChange={handleProfileTypeSwitch}
              disabled={isSwitchingProfile}
              className="scale-75"
            />
            <div className={`flex items-center space-x-1 text-xs ${profileType === 'seller' ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-2 h-2 rounded-full ${profileType === 'seller' ? 'bg-primary' : 'bg-muted'}`}></div>
              <span>Seller</span>
            </div>
          </div>
        </div>
      )}

      {/* Admin Role Badge - Shown for admin users */}
      {user?.role === 'admin' && (
        <div className="mb-6 p-3 glass-card rounded-lg">
          <div className="mb-3">
            <span className="text-sm text-muted-foreground">Role</span>
          </div>
          <div className="flex items-center justify-center p-2 bg-gradient-to-r from-red-500/10 to-pink-600/10 rounded-lg border border-red-500/20">
            <div className="flex items-center space-x-2 text-sm font-semibold text-red-600">
              <Settings className="h-4 w-4" />
              <span>Administrator</span>
            </div>
          </div>
        </div>
      )}

      {/* Admin Panel Link (only for admin users) */}
      {user?.role === 'admin' && (
        <div className="mb-4">
          <Link
            to="/admin"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700 transition-all duration-200 shadow-lg"
          >
            <Settings className="h-4 w-4" />
            Admin Panel
          </Link>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => mobile && setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="glass-card rounded-none border-r border-border/50 h-full">
          <Sidebar />
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0 glass-card">
          <Sidebar mobile />
        </SheetContent>
      </Sheet>

      {/* Top Navigation - Full Width */}
      <header className="sticky top-0 z-30 glass-card border-b border-border/50">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 lg:pl-80">
          {/* Mobile menu button */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
          </Sheet>

          {/* Page title - hidden on mobile to save space */}
          <div className="hidden sm:block">
            <h2 className="text-lg font-semibold">
              {navItems.find(item => item.href === location.pathname)?.name || 'Dashboard'}
            </h2>
          </div>

          {/* User display with logout */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getInitials(user?.fullName || '')}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium">
                {user?.fullName}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="lg:pl-72">
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;