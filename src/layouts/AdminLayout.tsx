
import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Music } from 'lucide-react';

const AdminLayout: React.FC = () => {
  const { user, signOut, isAdmin, isSuperAdmin, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-3 text-lg">Loading Admin Panel...</p>
      </div>
    );
  }

  // If no user, redirect to admin login
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  // Check admin access after user is confirmed to exist
  const hasAdminAccess = isAdmin() || isSuperAdmin();
  
  if (!hasAdminAccess) {
    console.warn("AdminLayout: User is not admin/super_admin. Redirecting to dashboard.");
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Admin Header */}
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Music className="h-8 w-8 mr-2" />
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
        <Outlet />
      </main>

      {/* Optional Admin Footer */}
      <footer className="bg-background border-t border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} MelodyVerse Admin. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default AdminLayout;
