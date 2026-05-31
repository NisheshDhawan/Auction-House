import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, isAuthenticated } = useAuth();

  console.log('AdminRoute - isAuthenticated:', isAuthenticated, 'user:', user); // Debug log

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('AdminRoute - redirecting to login'); // Debug log
    return <Navigate to="/login" replace />;
  }

  // Redirect to dashboard if not admin
  if (user?.role !== 'admin') {
    console.log('AdminRoute - user is not admin, redirecting to dashboard'); // Debug log
    return <Navigate to="/dashboard" replace />;
  }

  console.log('AdminRoute - rendering admin content'); // Debug log
  // Render admin content if user is admin
  return <>{children}</>;
};

export default AdminRoute;