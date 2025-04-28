
import { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const ProtectedRoute = () => {
  const { user, loading, isAdmin, session } = useAuth();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  useEffect(() => {
    // Give a little time for the auth state to settle
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [loading]);
  
  // Show toast only when we're sure about the auth state (not loading/checking)
  useEffect(() => {
    if (!loading && !isChecking) {
      if (!user) {
        toast.error("You need to log in to access this page");
      } else if (isAdminRoute && !isAdmin()) {
        toast.error("You don't have admin privileges to access this page");
      }
    }
  }, [user, loading, isChecking, isAdminRoute, isAdmin]);

  // Show loading state while checking auth
  if (loading || isChecking) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melody-secondary"></div>
        <div className="ml-3">Verifying access...</div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Handle admin routes
  if (isAdminRoute) {
    const isSuperAdmin = user.email === "ellaadahosa@gmail.com";
    
    if (!isAdmin() && !isSuperAdmin) {
      return <Navigate to="/dashboard" state={{ from: location }} replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
