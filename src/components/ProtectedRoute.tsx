
import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import LockedFeatureNotice from './ui/LockedFeatureNotice'; // Import the new component

interface ProtectedRouteProps {
  allowedRoles?: string[]; // Roles that are explicitly allowed for this route (e.g., ['subscriber', 'admin'])
  requiredRoles?: string[]; // User must have ALL these roles (e.g. ['subscriber', 'affiliate'] for affiliate dashboard)
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, requiredRoles }) => {
  const { user, loading, isAdmin, isSuperAdmin, isVoter, isSubscriber, isAffiliate, session, userRoles } = useAuth();
  const location = useLocation();
  const [hasShownToast, setHasShownToast] = useState(false); // To prevent toast spam on re-renders

  // Normalize path for easier comparison
  const currentPath = location.pathname.endsWith('/') && location.pathname.length > 1
                      ? location.pathname.slice(0, -1)
                      : location.pathname;

  // Show loading state only during initial auth check
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melody-secondary"></div>
        <div className="ml-3">Verifying access...</div>
      </div>
    );
  }

  // Redirect if not authenticated for any protected route
  if (!user || !session) {
    if (!hasShownToast) {
      toast.error("You need to log in to access this page");
      setHasShownToast(true);
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userIsOnlyVoter = isVoter() && !isSubscriber() && !isAdmin() && !isSuperAdmin() && !isAffiliate();
  const userIsSubscriber = isSubscriber(); // This now correctly reflects if they have 'subscriber' role or active sub
  const userIsAffiliate = isAffiliate(); // Has 'affiliate' role

  // --- Voter Access Control ---
  // Voters can only access specific pages. All others show LockedFeatureNotice.
  if (userIsOnlyVoter) {
    const voterAllowedExactPaths = ['/contest', '/subscribe', '/profile', '/login', '/register'];
    // Add paths that can start with a prefix, e.g., /contest/entry/123
    const voterAllowedPathPrefixes: string[] = [];

    const isPathAllowedForVoter =
      voterAllowedExactPaths.includes(currentPath) ||
      voterAllowedPathPrefixes.some(prefix => currentPath.startsWith(prefix));

    if (currentPath === '/' || currentPath === '/dashboard') { // Voters trying to access general dashboard
        // Redirect to /contest, or show LockedFeatureNotice if /dashboard should be fully locked
        // For now, let's assume /dashboard is locked for voters and they should be guided
        console.log('ProtectedRoute: Voter accessing root or dashboard, showing lock screen.');
        return <LockedFeatureNotice />;
    }

    if (!isPathAllowedForVoter) {
      console.log(`ProtectedRoute: Voter attempt to access ${currentPath}. Showing lock screen.`);
      return <LockedFeatureNotice />;
    }
    // If allowed, proceed to Outlet (further checks like allowedRoles might apply if specified for these paths)
  }

  // --- Role-based access for authenticated users beyond just "voter" ---

  // 1. Admin Route Check (Specific for paths starting with /admin)
  const isAdminRoute = currentPath.startsWith('/admin');
  if (isAdminRoute) {
    if (!isAdmin() && !isSuperAdmin()) {
      if (!hasShownToast) {
        toast.error("You don't have admin privileges to access this page.");
        setHasShownToast(true);
      }
      // For admin routes, redirecting to a general non-admin page or showing a generic "access denied" might be better
      // than LockedFeatureNotice, which implies subscription.
      return <Navigate to="/" state={{ from: location }} replace />;
    }
    // If admin/super_admin, allow access to <Outlet /> for admin routes
    // Specific permissions within admin sections can be handled by the components themselves or more granular routes.
  } else { // Non-admin routes, apply allowedRoles and requiredRoles
    // 2. Required Roles Check (User must have ALL roles in requiredRoles)
    if (requiredRoles && requiredRoles.length > 0) {
      const hasAllRequiredRoles = requiredRoles.every(role => userRoles.includes(role));
      if (!hasAllRequiredRoles) {
        console.log(`ProtectedRoute: User ${user.id} lacks ALL required roles for ${currentPath}. Needed: ${requiredRoles.join(' AND ')}, Has: ${userRoles.join(', ')}`);
        // This could be a specific "access denied" message or LockedFeatureNotice if appropriate
        if (!hasShownToast) {
            toast.error("You do not have all the necessary permissions for this page.");
            setHasShownToast(true);
        }
        // Redirect to a safe page, like user's default dashboard or home.
        // If an affiliate tries to access affiliate dashboard but isn't a subscriber, they should be locked out.
        // The `affiliate` role might persist, but access to features requires `subscriber`.
        if (requiredRoles.includes('subscriber') && !userIsSubscriber) {
            return <LockedFeatureNotice />; // Show subscribe notice if subscriber is required and missing
        }
        return <Navigate to="/" state={{ from: location }} replace />;
      }
    }

    // 3. Allowed Roles Check (User must have AT LEAST ONE of the roles in allowedRoles)
    // This is typically used if multiple roles can access a route.
    // This check should happen *after* the voter check, so it applies to subscribers, affiliates, etc.
    if (allowedRoles && allowedRoles.length > 0 && !userIsOnlyVoter) {
      const hasAllowedRole = allowedRoles.some(role => userRoles.includes(role));
      if (!hasAllowedRole) {
        console.log(`ProtectedRoute: User ${user.id} lacks ANY allowed role for ${currentPath}. Allowed: ${allowedRoles.join(' OR ')}, Has: ${userRoles.join(', ')}`);
        if (!hasShownToast) {
          toast.error("You do not have the necessary permissions to access this page.");
          setHasShownToast(true);
        }
        // If it's a subscriber feature and they are not a subscriber, show lock.
        if (allowedRoles.includes('subscriber') && !userIsSubscriber) {
             return <LockedFeatureNotice />;
        }
        return <Navigate to="/" state={{ from: location }} replace />;
      }
    }
  }

  // --- Special case for Unsubscribed Affiliate ---
  // An affiliate who is not currently a subscriber should be blocked from subscriber-only content
  // and the affiliate dashboard (as it requires subscriber features).
  // The `requiredRoles` check for the affiliate dashboard (e.g., `['affiliate', 'subscriber']`) handles this.
  // For general subscriber features, if `allowedRoles=['subscriber']` is used, they'd be blocked.
  // If they try to access a generic page that isn't specifically role-restricted beyond "authenticated user",
  // they might get through. We need to ensure pages like song generation, voice cloning are explicitly
  // protected by `allowedRoles=['subscriber']` or `requiredRoles=['subscriber']`.

  // If all checks pass, render the requested component
  console.log(`ProtectedRoute: Access GRANTED for user ${user?.id} (${userRoles.join(', ')}) to path ${currentPath}`);
  return <Outlet />;
};

export default ProtectedRoute;
