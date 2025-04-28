import { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const ProtectedRoute = () => {
  const { user, loading, isAdmin, session } = useAuth();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        setIsChecking(false);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [loading]);
  
  useEffect(() => {
    if (!loading && !user && !isChecking) {
      toast.error("Access denied", {
        description: "You need to log in to access this page"
      });
    }
    
    if (!loading && user && isAdminRoute && !isAdmin() && !isChecking) {
      toast.error("Access denied", {
        description: "You don't have admin privileges to access this page"
      });
    }
  }, [loading, user, location.pathname, isChecking, isAdminRoute, isAdmin]);

  if (loading || isChecking) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melody-secondary"></div>
        <div className="ml-3">Verifying access...</div>
      </div>
    );
  }

  if (isAdminRoute) {
    if (!user) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    
    const isSuperAdmin = user.email === "ellaadahosa@gmail.com";
    
    if (!isAdmin() && !isSuperAdmin) {
      return <Navigate to="/dashboard" state={{ from: location }} replace />;
    }
  } else {
    if (!user) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
