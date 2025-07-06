
import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import VoterLockScreen from './VoterLockScreen';

interface ProtectedRouteProps {
  allowedRoles?: string[];
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
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

  // Check for subscription success in URL and handle it
  const urlParams = new URLSearchParams(location.search);
  const subscriptionStatus = urlParams.get('subscription');
  
  if (subscriptionStatus === 'success') {
    // Clear the URL parameter and redirect to dashboard
    const newUrl = location.pathname;
    window.history.replaceState({}, '', newUrl);
    return <Navigate to="/dashboard" replace />;
  }

  // Determine user's effective role status - STRICT CHECK
  const isOnlyVoter = isVoter() && !isSubscriber() && !isAffiliate() && !isAdmin() && !isSuperAdmin();
  const hasActiveSubscription = isSubscriber() && userRoles.includes('subscriber');

  console.log('🔐 ProtectedRoute access check:', {
    path: location.pathname,
    isOnlyVoter,
    hasActiveSubscription,
    userRoles,
    isSubscriber: isSubscriber(),
    isVoter: isVoter(),
    isAdmin: isAdmin(),
    isSuperAdmin: isSuperAdmin(),
    isAdminRoute
  });

  // Redirect root to appropriate dashboard based on role
  if (location.pathname === "/") {
    if (isAdmin() || isSuperAdmin()) {
      console.log("ProtectedRoute: Admin user at root, redirecting to admin panel");
      return <Navigate to="/admin" replace />;
    }
    console.log("ProtectedRoute: Regular user at root, redirecting to dashboard");
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
    return children ? <>{children}</> : <Outlet />;
  }

  // IMPORTANT: Prevent admins from accessing regular user routes
  if ((isAdmin() || isSuperAdmin()) && !isAdminRoute) {
    console.log("ProtectedRoute: Admin trying to access user route, redirecting to admin panel");
    return <Navigate to="/admin" replace />;
  }

  // Allow voters to access profile page
  const isProfilePage = location.pathname.toLowerCase() === '/profile';
  
  // STRICT ACCESS CONTROL: Only allow voters to access contest, subscribe, dashboard, and profile pages
  if (isOnlyVoter) {
    const isContestPage = location.pathname.toLowerCase() === '/contest' || location.pathname.toLowerCase().startsWith('/contest/');
    const isSubscribePage = location.pathname.toLowerCase() === '/subscribe' || location.pathname.toLowerCase() === '/credits';
    const isDashboardPage = location.pathname.toLowerCase() === '/dashboard';

    if (isContestPage || isSubscribePage || isDashboardPage || isProfilePage) {
      return children ? <>{children}</> : <Outlet />;
    }
    
    // Block all other pages for voters
    return <VoterLockScreen feature="this feature" />;
  }

  // For users who should be subscribers but subscription has lapsed
  if (!hasActiveSubscription && !isAdmin() && !isSuperAdmin()) {
    const isContestPage = location.pathname.toLowerCase() === '/contest' || location.pathname.toLowerCase().startsWith('/contest/');
    const isSubscribePage = location.pathname.toLowerCase() === '/subscribe' || location.pathname.toLowerCase() === '/credits';
    const isDashboardPage = location.pathname.toLowerCase() === '/dashboard';

    // Allow access to these pages even for lapsed subscribers
    if (isContestPage || isSubscribePage || isDashboardPage || isProfilePage) {
      return children ? <>{children}</> : <Outlet />;
    }

    // Block other pages for lapsed subscribers
    return <VoterLockScreen 
      feature="this feature" 
      message="Your subscription has expired. Please renew to continue accessing premium features."
    />;
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
    if (!hasActiveSubscription && !allowedRoles.includes('admin') && !allowedRoles.includes('super_admin')) {
      return <VoterLockScreen message="Your subscription is inactive. Please subscribe to access this feature." />;
    }
    return children ? <>{children}</> : <Outlet />;
  }

  // For all other routes, require active subscription
  if (!hasActiveSubscription && !isAdmin() && !isSuperAdmin()) {
    return <VoterLockScreen message="An active subscription is required to access this page." />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
