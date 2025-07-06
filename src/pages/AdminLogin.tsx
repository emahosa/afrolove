
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
  const [loading, setLoading] = useState(false);
  const { login, isAdmin, isSuperAdmin, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is already logged in and is an admin, redirect to /admin
    if (!authLoading && user && (isAdmin() || isSuperAdmin())) {
      console.log('AdminLogin: User is already admin, redirecting to /admin');
      navigate('/admin', { replace: true });
    }
    // If user is logged in but NOT an admin, redirect to regular dashboard
    else if (!authLoading && user && !isAdmin() && !isSuperAdmin()) {
      console.log('AdminLogin: User is not admin, redirecting to dashboard');
      toast.error("You don't have admin privileges. Redirecting to user dashboard.");
      navigate('/dashboard', { replace: true });
    }
  }, [user, isAdmin, isSuperAdmin, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      console.log('AdminLogin: Attempting login for:', email);
      const { data, error: authError } = await login(email, password);
      
      if (authError) {
        console.error('AdminLogin: Auth error:', authError);
        setError(authError.message);
        setLoading(false);
        return;
      }

      console.log('AdminLogin: Login successful, waiting for auth context to update...');
      // The useEffect above will handle the redirection once auth context updates
      
    } catch (err) {
      console.error('AdminLogin: Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
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
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Access Admin Panel'}
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
