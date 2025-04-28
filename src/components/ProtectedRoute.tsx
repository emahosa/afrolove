
import { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Only show the toast if we're not in the process of loading and the user is not logged in
    if (!loading && !isChecking && !user && location.pathname !== '/login') {
      toast.error("Access denied", {
        description: "You need to log in to access this page"
      });
    }
    
    // Mark checking as complete once loading is done
    if (!loading && isChecking) {
      setIsChecking(false);
    }
  }, [loading, user, location.pathname, isChecking]);

  console.log("ProtectedRoute state:", { user, loading, pathname: location.pathname });

  // Show loading state if we're still checking auth status
  if (loading || isChecking) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melody-secondary"></div>
      </div>
    );
  }

  // If we have a user, let them access the route, otherwise redirect to login
  return user ? <Outlet /> : <Navigate to="/login" state={{ from: location }} replace />;
};

export default ProtectedRoute;
