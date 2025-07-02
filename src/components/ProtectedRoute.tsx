
import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, loading, isAdmin, isSuperAdmin, isVoter, isSubscriber, session, userRoles } = useAuth();
  const location = useLocation();
  const [hasShownToast, setHasShownToast] = useState(false);
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  // Show loading state only during initial auth check
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

  // Handle role-based access if allowedRoles is provided
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRequiredRole = userRoles.some(role => allowedRoles.includes(role));
    if (!hasRequiredRole) {
      console.log(`ProtectedRoute: User ${user.id} lacks required roles for this route. Needed: ${allowedRoles.join(', ')}, Has: ${userRoles.join(', ')}`);
      if (!hasShownToast) {
        toast.error("You do not have the necessary permissions to access this page.");
        setHasShownToast(true);
      }
      return <Navigate to="/dashboard" state={{ from: location }} replace />;
    }
  }
  // Note: The duplicated login check that was here has been removed.

  // Handle admin routes
  // This check is specific to /admin/* paths and can coexist with allowedRoles for non-admin paths.
  // For admin paths, this provides more granular control or specific logic if needed beyond just role presence.
  if (isAdminRoute) {
    // If user is not admin or super_admin, they shouldn't access admin routes.
    // This also implies that admin routes don't *need* to pass allowedRoles if this block is sufficient.
    // Or, if they do, this becomes a secondary check.
    if (!isAdmin() && !isSuperAdmin()) {
      console.log('ProtectedRoute: User lacks admin privileges for admin route.');
      if (!hasShownToast) {
        toast.error("You don't have admin privileges to access this page");
        setHasShownToast(true);
      }
      return <Navigate to="/dashboard" state={{ from: location }} replace />;
    }
    // If user is admin/super_admin, further checks inside admin pages can handle specific permissions.
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
      // Voters can see dashboard (locked features), profile, contest, support, subscribe page, and become-affiliate
      const allowedVoterPaths = [
        '/contest',
        '/dashboard',
        '/profile',
        '/support',
        '/subscribe',
        '/become-affiliate'
      ];
      const isAllowedPathForVoter = allowedVoterPaths.some(p => location.pathname.startsWith(p));
      
      // Specific check for root path "/" for voters, redirect to /dashboard
      if (location.pathname === "/") {
        return <Navigate to="/dashboard" replace />;
      }

      if (!isAllowedPathForVoter) {
        console.log('ProtectedRoute: Voter trying to access restricted page:', location.pathname);
        if (!hasShownToast) {
          toast.error("This feature requires a subscription. Please subscribe or visit allowed pages like Contest.");
          setHasShownToast(true);
        }
        return <Navigate to="/dashboard" state={{ from: location }} replace />; // Or /contest, or /subscribe
      }
    }
  }

  console.log('ProtectedRoute: Access granted for user:', user?.id, 'to path:', location.pathname);
  return <Outlet />;
};

export default ProtectedRoute;
