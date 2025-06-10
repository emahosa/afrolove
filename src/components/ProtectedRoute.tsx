
import { useEffect, useState, ReactNode } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children?: ReactNode;
  requiredRole?: string;
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading, isAdmin, session } = useAuth();
  const location = useLocation();
  const [hasShownToast, setHasShownToast] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  useEffect(() => {
    if (!loading) {
      setIsInitialized(true);
    }
  }, [loading]);

  // Show loading state only during initial auth check
  if (loading && !isInitialized) {
    console.log('ProtectedRoute: Loading auth state');
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melody-secondary"></div>
        <div className="ml-3">Verifying access...</div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user || !session) {
    console.log('ProtectedRoute: No user or session, redirecting to login');
    if (!hasShownToast) {
      toast.error("You need to log in to access this page");
      setHasShownToast(true);
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Handle admin routes
  if (isAdminRoute || requiredRole === 'admin') {
    const isSuperAdmin = user.email === "ellaadahosa@gmail.com";
    
    if (!isSuperAdmin && !isAdmin()) {
      console.log('ProtectedRoute: User lacks admin privileges');
      if (!hasShownToast) {
        toast.error("You don't have admin privileges to access this page");
        setHasShownToast(true);
      }
      return <Navigate to="/dashboard" state={{ from: location }} replace />;
    }
  }

  console.log('ProtectedRoute: Access granted for user:', user.id);
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
