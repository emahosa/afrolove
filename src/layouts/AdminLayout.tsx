import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Music } from 'lucide-react'; // Assuming Music is your app icon

const AdminLayout: React.FC = () => {
  const { user, logout, isAdmin, isSuperAdmin, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-3 text-lg">Loading Admin Panel...</p>
      </div>
    );
  }

  // This layout should only be reachable if ProtectedRoute has already vetted the user is an admin.
  // However, an additional check here can be a safeguard.
  if (!isAdmin() && !isSuperAdmin()) {
    console.warn("AdminLayout: Non-admin attempting to access. This should have been caught by ProtectedRoute.");
    // Redirect to user dashboard or login. User dashboard is probably safer if they were somehow authenticated.
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogout = async () => {
    await logout();
    // After logout, navigate to admin login or a public page.
    // useNavigate() hook can't be used directly here if this component isn't rendered by a Route.
    // For simplicity, logout() in AuthContext should handle redirection or App.tsx state change will.
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Admin Header */}
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Music className="h-8 w-8 mr-2" /> {/* App Icon */}
              <h1 className="text-xl font-semibold">Admin Control Panel</h1>
            </div>
            <div className="flex items-center">
              {user && (
                <span className="text-sm mr-4 hidden sm:inline">
                  Admin: {user.email}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={handleLogout} className="text-primary-foreground border-primary-foreground hover:bg-primary-foreground/10">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Admin Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <Outlet /> {/* This is where the specific admin page (e.g., Admin.tsx) will render */}
      </main>

      {/* Optional Admin Footer */}
      <footer className="bg-gray-100 border-t border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} MelodyVerse Admin. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default AdminLayout;
