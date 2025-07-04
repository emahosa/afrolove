
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
      navigate('/admin', { replace: true });
    }
    // If user is logged in but NOT an admin, redirect to regular login
    else if (!authLoading && user && !isAdmin() && !isSuperAdmin()) {
      toast.error("You don't have admin privileges. Redirecting to user dashboard.");
      navigate('/dashboard', { replace: true });
    }
  }, [user, isAdmin, isSuperAdmin, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: authError } = await login(email, password);
      
      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // Wait a moment for auth context to update
      setTimeout(() => {
        // Check if the logged-in user is actually an admin
        if (email === "ellaadahosa@gmail.com") {
          toast.success("Admin login successful!");
          navigate('/admin');
        } else {
          // For other users, check their role in the database
          // This will be handled by the useEffect above
        }
        setLoading(false);
      }, 1000);

    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Admin login error:', err);
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
