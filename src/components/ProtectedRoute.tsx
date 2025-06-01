
import { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const ProtectedRoute = () => {
  const { user, loading, isAdmin, session } = useAuth();
  const location = useLocation();
  const [hasShownToast, setHasShownToast] = useState(false);
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  // Show loading only while authentication is being verified
  if (loading) {
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
  if (isAdminRoute) {
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
  return <Outlet />;
};

export default ProtectedRoute;
