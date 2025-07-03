
import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import LockScreen from './LockScreen';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, loading, isAdmin, isSuperAdmin, isVoter, isSubscriber, session, userRoles, isAffiliate } = useAuth();
  const location = useLocation();
  const [hasShownToast, setHasShownToast] = useState(false);
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melody-secondary"></div>
        <div className="ml-3">Verifying access...</div>
      </div>
    );
  }

  if (!user || !session) {
    if (!hasShownToast) {
      toast.error("You need to log in to access this page");
      setHasShownToast(true);
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Determine user's effective role status
  const isOnlyVoter = isVoter() && !isSubscriber() && !isAffiliate() && !isAdmin() && !isSuperAdmin();

  // Specific check for root path "/" for anyone, redirect to /dashboard
  if (location.pathname === "/") {
    return <Navigate to="/dashboard" replace />;
  }

  // Handle admin routes - admins bypass all other checks
  if (isAdminRoute) {
    if (!isAdmin() && !isSuperAdmin()) {
      if (!hasShownToast) {
        toast.error("You don't have admin privileges to access this page");
        setHasShownToast(true);
      }
      return <Navigate to="/dashboard" state={{ from: location }} replace />;
    }
    return <Outlet />;
  }

  // Handle "OnlyVoter" case - only allow contest and subscribe pages
  if (isOnlyVoter) {
    const isContestPage = location.pathname.toLowerCase() === '/contest' || location.pathname.toLowerCase().startsWith('/contest/');
    const isSubscribePage = location.pathname.toLowerCase() === '/subscribe';

    if (isContestPage || isSubscribePage) {
      return <Outlet />;
    }
    return <LockScreen message="Subscribe to access this feature." />;
  }

  // For routes with specific role requirements (like affiliate dashboard)
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRequiredRole = userRoles.some(role => allowedRoles.includes(role));
    if (!hasRequiredRole) {
      if (allowedRoles.includes('affiliate') && !isAffiliate() && isSubscriber()) {
        toast.error("This section is for approved affiliates only.");
      } else {
        toast.error("You do not have the necessary permissions to access this page.");
      }
      return <Navigate to="/dashboard" state={{ from: location }} replace />;
    }
    
    // Ensure affiliates still have active subscription
    if (!isSubscriber() && !allowedRoles.includes('admin') && !allowedRoles.includes('super_admin')) {
      const isAffiliateRoute = allowedRoles.includes('affiliate') && location.pathname.toLowerCase().startsWith('/affiliate');
      if (!isAffiliateRoute) {
        return <LockScreen message="Your subscription is inactive. Please subscribe to access this feature." />;
      }
    }
    return <Outlet />;
  }

  // For general routes, require subscription (except for admins)
  if (!isSubscriber() && !isAdmin() && !isSuperAdmin()) {
    return <LockScreen message="An active subscription is required to access this page." />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
