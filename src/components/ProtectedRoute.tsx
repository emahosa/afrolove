
import { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const ProtectedRoute = () => {
  const { user, loading, isAdmin, isSuperAdmin, isVoter, isSubscriber, session } = useAuth();
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
  if (isAdminRoute) {
    if (isSuperAdmin()) {
      console.log('ProtectedRoute: Super admin access granted for admin route');
    } else if (isAdmin()) {
      console.log('ProtectedRoute: Regular admin access granted for admin route');
      // Permissions for specific admin sections are checked within those components/pages
    } else {
      console.log('ProtectedRoute: User lacks admin privileges for admin route');
      if (!hasShownToast) {
        toast.error("You don't have admin privileges to access this page");
        setHasShownToast(true);
      }
      return <Navigate to="/dashboard" state={{ from: location }} replace />;
    }
  } else {
    // Handle non-admin routes for Voters
    const userIsOnlyVoter = isVoter() && !isSubscriber() && !isAdmin() && !isSuperAdmin();
    if (userIsOnlyVoter) {
      const allowedVoterPaths = ['/contest', '/dashboard', '/profile']; // Voters can see dashboard (locked features) and profile
      const isAllowedPathForVoter = allowedVoterPaths.some(p => location.pathname.startsWith(p));
      
      // Specific check for root path "/" for voters, redirect to /dashboard
      if (location.pathname === "/") {
        return <Navigate to="/dashboard" replace />;
      }

      if (!isAllowedPathForVoter) {
        console.log('ProtectedRoute: Voter trying to access restricted page:', location.pathname);
        if (!hasShownToast) {
          toast.error("This feature requires a subscription. Voters can access contest features.");
          setHasShownToast(true);
        }
        return <Navigate to="/dashboard" state={{ from: location }} replace />; // Or /contest
      }
    }
  }

  console.log('ProtectedRoute: Access granted for user:', user.id, 'to path:', location.pathname);
  return <Outlet />;
};

export default ProtectedRoute;
