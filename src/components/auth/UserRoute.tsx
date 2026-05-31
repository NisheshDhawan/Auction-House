import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface UserRouteProps {
  children: React.ReactNode;
}

const UserRoute = ({ children }: UserRouteProps) => {
  const { user, isAuthenticated } = useAuth();

  console.log('UserRoute - isAuthenticated:', isAuthenticated, 'user:', user); // Debug log

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('UserRoute - redirecting to login'); // Debug log
    return <Navigate to="/login" replace />;
  }

  // Redirect admin users to admin panel - they should not access user routes
  if (user?.role === 'admin') {
    console.log('UserRoute - admin user, redirecting to admin panel'); // Debug log
    return <Navigate to="/admin" replace />;
  }

  console.log('UserRoute - rendering user content'); // Debug log
  // Render user content if user is not admin
  return <>{children}</>;
};

export default UserRoute;