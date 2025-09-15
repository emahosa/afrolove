import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Music } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, isAdmin, isSuperAdmin, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect if user is authenticated AND has admin privileges
    if (!authLoading && user) {
      const hasAdminAccess = isAdmin() || isSuperAdmin();
      console.log("AdminLogin: Checking admin access for user:", user.id, "hasAdminAccess:", hasAdminAccess);
      if (hasAdminAccess) {
        console.log("AdminLogin: Admin user detected, redirecting to admin panel");
        navigate('/admin', { replace: true });
      } else {
        // User is logged in but not admin - sign them out and show error
        console.log("AdminLogin: User is not admin, signing out");
        toast.error("You don't have admin privileges. Logging you out.");
        supabase.auth.signOut();
      }
    }
  }, [user, isAdmin, isSuperAdmin, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      console.log("AdminLogin: Attempting admin login for:", email);

      // Special handling for super admin email
      if (email.toLowerCase() === 'ellaadahosa@gmail.com') {
        console.log("AdminLogin: Super admin email detected");
        const { error: authError } = await login(email, password);
        
        if (authError) {
          console.error("AdminLogin: Super admin login failed:", authError);
          setError(authError.message);
          return;
        }

        toast.success("Super admin login successful!");
        return;
      }

      // For other users, check admin privileges by user ID first
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error("AdminLogin: Authentication failed:", authError);
        setError(authError.message);
        return;
      }

      if (!authData.user) {
        setError('Login failed - no user data returned');
        return;
      }

      // Check if this user has admin roles using their user ID
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .in('role', ['admin', 'super_admin']);

      if (roleError) {
        console.error("AdminLogin: Error checking roles:", roleError);
        setError('Error verifying admin privileges');
        await supabase.auth.signOut();
        return;
      }

      if (!roleData || roleData.length === 0) {
        console.log("AdminLogin: User has no admin roles");
        setError('You do not have admin privileges');
        await supabase.auth.signOut();
        return;
      }

      console.log("AdminLogin: Admin roles found:", roleData);
      toast.success("Admin login successful!");

    } catch (err) {
      console.error('AdminLogin: Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
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
          <CardTitle className="text-2xl sm:text-3xl font-bold text-red-800">Admin Panel Access</CardTitle>
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
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Access Admin Panel'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center flex-col space-y-2">
          <p className="text-sm text-red-600">
            Unauthorized access attempts are logged and monitored.
          </p>
          <p className="text-xs text-red-500">
            Regular users should use the{" "}
            <button 
              onClick={() => navigate('/login')}
              className="underline hover:no-underline"
            >
              standard login page
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AdminLoginPage;
