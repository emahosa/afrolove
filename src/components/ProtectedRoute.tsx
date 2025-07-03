
import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import LockScreen from './LockScreen'; // Import the new LockScreen component

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
  // If they are "onlyVoter", dashboard itself will show lockscreen unless it's /contest or /subscribe
  if (location.pathname === "/") {
    return <Navigate to="/dashboard" replace />;
  }

  // Handle admin routes
  if (isAdminRoute) {
    if (!isAdmin() && !isSuperAdmin()) {
      if (!hasShownToast) {
        toast.error("You don't have admin privileges to access this page");
        setHasShownToast(true);
      }
      return <Navigate to="/dashboard" state={{ from: location }} replace />;
    }
    // Admin/SuperAdmin can access admin routes
    return <Outlet />;
  }

  // --- Role-based access for non-admin routes ---

  // Handle "OnlyVoter" case first
  if (isOnlyVoter) {
    const isContestPage = location.pathname.toLowerCase() === '/contest' || location.pathname.toLowerCase().startsWith('/contest/');
    const isSubscribePage = location.pathname.toLowerCase() === '/subscribe';

    if (isContestPage || isSubscribePage) {
      return <Outlet />; // Allow access to contest and subscribe pages for voters
    }
    return <LockScreen />;
  }

  // For all other authenticated users (Subscribers, Affiliates who are also Subscribers)
  // Check if they are trying to access a route with specific role requirements
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
    // User has the specific role required by allowedRoles (e.g., 'affiliate' for /affiliate)
    // Now, ensure they are still an active subscriber if the role isn't admin/super_admin
    // (AffiliateDashboard itself will also check this, providing defense in depth)
    if (!isSubscriber() && !allowedRoles.includes('admin') && !allowedRoles.includes('super_admin')) {
        // This implies an affiliate (or other role) whose subscription lapsed.
        // For /affiliate, AffiliateDashboard.tsx handles the LockScreen.
        // For other potential allowedRoles, this provides a LockScreen.
        const isAffiliateRoute = allowedRoles.includes('affiliate') && location.pathname.toLowerCase().startsWith('/affiliate');
        if (!isAffiliateRoute) { // Avoid double LockScreen if AffiliateDashboard handles it
            return <LockScreen message="Your subscription is inactive. Please subscribe to access this feature." />;
        }
    }
    return <Outlet />;
  }

  // For general authenticated routes that are not admin, not for "OnlyVoters",
  // and do not have specific 'allowedRoles' that the user has matched.
  // (e.g. /create, /library, /dashboard itself, /profile, /support, /my-custom-songs, etc.)
  // These require an active subscription. This also covers Affiliates using general subscriber features.
  if (!isSubscriber()) {
    // If we reach here, it means the user is authenticated, not an admin on an admin route,
    // not an "OnlyVoter" on a voter-allowed page, and didn't match any specific allowedRoles.
    // Therefore, they must be a subscriber to access any other page.
    return <LockScreen message="An active subscription is required to access this page." />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
