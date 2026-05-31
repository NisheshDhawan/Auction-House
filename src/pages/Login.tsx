import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Gavel, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { authAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import AuthNavbar from "@/components/landing/AuthNavbar";



const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, user, isAuthenticated, isAdmin } = useAuth();



  // Handle navigation when authentication state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authAPI.login({ email, password });

      if (response.user && response.token) {
        login(response.user, response.token);
        
        // Show success message - navigation will be handled by useEffect
        toast({
          title: response.user.role === 'admin' ? "Welcome back, Admin!" : "Welcome back!",
          description: "You've successfully logged in.",
        });
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white relative">
      {/* Emerald Glow Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `radial-gradient(125% 125% at 50% 10%, #ffffff 40%, #10b981 100%)`,
          backgroundSize: "100% 100%",
        }}
      />

      {/* Navbar */}
      <div className="relative z-[110]">
        <AuthNavbar />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6 pt-24">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center">
              <Gavel className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-serif font-bold text-black">Auction House</span>
          </div>

        <Card className="bg-white/95 backdrop-blur-sm border-black/10 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-black">Welcome back</CardTitle>
            <CardDescription className="text-black/60">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-black">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-black/50" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white border-black/20 text-black placeholder:text-black/40"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-black">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-black/50" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-white border-black/20 text-black placeholder:text-black/40"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-black/50 hover:text-black/70 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full bg-black hover:bg-black/90 text-white" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
              <Button 
                type="button" 
                onClick={() => {
                  setEmail('admin@auctionhouse.com');
                  setPassword('password');
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Fill Admin Credentials
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-black/60">
              Don't have an account?{" "}
              <Link to="/signup" className="text-black font-medium hover:underline">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
