import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoute from "./components/auth/AdminRoute";
import UserRoute from "./components/auth/UserRoute";
import DashboardLayout from "./components/layout/DashboardLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import VerifyOTP from "./pages/VerifyOTP";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Profile from "./pages/Profile";
import ManageProducts from "./pages/ManageProducts";
import ManageListings from "./pages/ManageListings";
import PaymentSettings from "./pages/PaymentSettings";
import MySoldProducts from "./pages/MySoldProducts";
import MyProducts from "./pages/MyProducts";
import MyPurchases from "./pages/MyPurchases";
import BidHistory from "./pages/BidHistory";
import OrdersHistory from "./pages/OrdersHistory";
import Customers from "./pages/Customers";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminListings from "./pages/admin/AdminListings";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminBiddingHistory from "./pages/admin/AdminBiddingHistory";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to handle root route redirection
const RootRedirect = () => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) {
    return <Index />;
  }
  
  // Redirect admin users to admin panel
  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  
  // Redirect regular users to dashboard
  return <Navigate to="/dashboard" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Root route - redirect based on auth status */}
            <Route path="/" element={<RootRedirect />} />
            
            {/* Public routes - redirect to dashboard if authenticated */}
            <Route path="/login" element={
              <ProtectedRoute requireAuth={false}>
                <Login />
              </ProtectedRoute>
            } />
            <Route path="/signup" element={
              <ProtectedRoute requireAuth={false}>
                <Signup />
              </ProtectedRoute>
            } />
            <Route path="/verify-otp" element={
              <ProtectedRoute requireAuth={false}>
                <VerifyOTP />
              </ProtectedRoute>
            } />
            
            {/* User routes - require authentication and non-admin role */}
            <Route path="/dashboard" element={
              <UserRoute>
                <Dashboard />
              </UserRoute>
            } />
            <Route path="/products" element={
              <UserRoute>
                <Products />
              </UserRoute>
            } />
            <Route path="/profile" element={
              <UserRoute>
                <Profile />
              </UserRoute>
            } />
            
            {/* Buyer Navigation Routes */}
            <Route path="/my-products" element={
              <UserRoute>
                <MyProducts />
              </UserRoute>
            } />
            <Route path="/my-purchases" element={
              <UserRoute>
                <MyPurchases />
              </UserRoute>
            } />
            <Route path="/bid-history" element={
              <UserRoute>
                <BidHistory />
              </UserRoute>
            } />
            
            {/* Seller Navigation Routes */}
            <Route path="/manage-products" element={
              <UserRoute>
                <ManageProducts />
              </UserRoute>
            } />
            <Route path="/manage-listings" element={
              <UserRoute>
                <ManageListings />
              </UserRoute>
            } />
            <Route path="/payment-settings" element={
              <UserRoute>
                <PaymentSettings />
              </UserRoute>
            } />
            <Route path="/my-sold-products" element={
              <UserRoute>
                <MySoldProducts />
              </UserRoute>
            } />
            <Route path="/orders-history" element={
              <UserRoute>
                <OrdersHistory />
              </UserRoute>
            } />
            <Route path="/customers" element={
              <UserRoute>
                <Customers />
              </UserRoute>
            } />
            
            {/* Admin Routes */}
            <Route path="/admin" element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="listings" element={<AdminListings />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="bidding-history" element={<AdminBiddingHistory />} />
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
