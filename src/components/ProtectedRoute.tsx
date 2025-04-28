
import { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const ProtectedRoute = () => {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const isAdminRoute = location.pathname.startsWith('/admin');
  const adminStatus = isAdmin();

  useEffect(() => {
    // Only show the toast if we're not in the process of loading and the user is not logged in
    if (!loading && !user && !isChecking) {
      toast.error("Access denied", {
        description: "You need to log in to access this page"
      });
    }
    
    // Show toast if user is logged in but trying to access admin route without admin privileges
    if (!loading && user && isAdminRoute && !adminStatus && !isChecking) {
      toast.error("Access denied", {
        description: "You don't have admin privileges to access this page"
      });
    }
    
    // Mark checking as complete once loading is done
    if (!loading && isChecking) {
      setIsChecking(false);
    }
  }, [loading, user, location.pathname, isChecking, isAdminRoute, adminStatus]);

  console.log("ProtectedRoute: state:", { 
    user: user?.id, 
    loading, 
    isChecking,
    isAdminRoute,
    isAdmin: adminStatus,
    pathname: location.pathname 
  });

  // Show loading state if we're still checking auth status
  if (loading || isChecking) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melody-secondary"></div>
      </div>
    );
  }

  // Check for admin routes
  if (isAdminRoute) {
    // If not logged in, redirect to login
    if (!user) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    
    // If logged in but not admin, redirect to dashboard
    if (!adminStatus) {
      return <Navigate to="/dashboard" state={{ from: location }} replace />;
    }
  }

  // For non-admin routes, just check if user is logged in
  return user ? <Outlet /> : <Navigate to="/login" state={{ from: location }} replace />;
};

export default ProtectedRoute;
