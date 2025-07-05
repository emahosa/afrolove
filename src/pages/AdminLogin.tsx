
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Music } from "lucide-react";
import { toast } from "sonner";

const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // Renamed loading to isSubmitting for clarity
  const { login, isAdmin, isSuperAdmin, user, loading: authLoading, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // This effect handles redirection based on authentication state and roles.
    // It runs when authLoading, user, session, isAdmin, or isSuperAdmin changes.

    if (authLoading) {
      // If auth is still loading, do nothing and wait.
      return;
    }

    if (user && session) { // User is logged in
      if (isAdmin() || isSuperAdmin()) {
        // User is logged in and is an admin/super_admin, navigate to admin dashboard.
        // Check if already on /admin to prevent redundant navigation.
        if (window.location.pathname !== '/admin') {
          toast.success("Admin login successful! Redirecting...");
          navigate('/admin', { replace: true });
        }
      } else {
        // User is logged in but not an admin.
        toast.error("You don't have admin privileges. Redirecting to user dashboard.");
        navigate('/dashboard', { replace: true });
      }
    }
    // If !user or !session, and authLoading is false, it means user is not logged in.
    // In this case, the login form should be displayed, so no navigation is needed here.

  }, [user, session, isAdmin, isSuperAdmin, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Attempt to log in. AuthContext will update `user`, `session`, and `authLoading`.
      // The useEffect above will handle redirection once AuthContext state is updated.
      const { error: authError } = await login(email, password);
      
      if (authError) {
        setError(authError.message);
        // Toast error will be shown by AuthContext or here if desired
        toast.error(authError.message || "Login failed. Please check your credentials.");
      }
      // No explicit navigation here. useEffect will handle it.
      // The AuthContext's onAuthStateChange and getSession logic will eventually update
      // `user`, `session`, `isAdmin`, `isSuperAdmin`, and `authLoading`, triggering the useEffect.

    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Admin login error:', err);
      toast.error(err.message || 'An unexpected error occurred during login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading spinner if AuthContext is loading, or if this page is submitting.
  // This covers initial page load and during login submission.
  if (authLoading && !user) { // Only show full page loader if initially loading and no user yet
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-3 text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-red-200 shadow-2xl">
        <CardHeader className="text-center pb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-red-600 mr-3" />
            <Music className="h-12 w-12 text-red-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-red-800">Admin Panel Access</CardTitle>
          <CardDescription className="text-red-600">
            Restricted access for administrators only
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-red-700 font-medium">Administrator Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-red-200 focus:border-red-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-red-700 font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-red-200 focus:border-red-500"
              />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
            <Button 
              type="submit" 
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3"
              disabled={isSubmitting || (authLoading && !user)}
            >
              {isSubmitting || (authLoading && !user) ? 'Authenticating...' : 'Access Admin Panel'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center">
          <p className="text-sm text-red-600">
            Unauthorized access attempts are logged and monitored.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AdminLoginPage;
