import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
import React, { useState, useEffect } from 'react'; // Added useEffect
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login, isAdmin, logout, user, loading } = useAuth(); // Added user, loading
  const navigate = useNavigate();

  useEffect(() => {
    // If user is already logged in and is an admin, redirect to /admin
    // If user is logged in but NOT an admin, redirect to dashboard
    if (!loading && user) {
      if (isAdmin()) {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true }); // Or to a more appropriate page
      }
    }
  }, [user, isAdmin, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const { error: authError } = await login(email, password);
      if (authError) {
        setError(authError.message);
        return;
      }

      // The isAdmin function will be up-to-date after login due to AuthContext's useEffect
      // We might need a slight delay or a state change listener if isAdmin() isn't updated immediately.
      // For now, let's assume it updates quickly enough.
      // A more robust way would be to have login return the user object with roles,
      // or have AuthContext expose a way to refresh/check roles post-login immediately.

      // AuthContext will update its state. ProtectedRoute guarding /admin will verify role.
      // If login is successful, navigate to /admin.
      // ProtectedRoute will then check if the user is an admin.
      // If not, ProtectedRoute will redirect to a default page (e.g., /dashboard or /login).
      navigate('/admin');

    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      // It's possible the login itself failed without throwing authError, but a general error.
      // Or, if login succeeded but something else went wrong.
      console.error('Login error:', err);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Admin Login</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access the admin panel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-sm text-center">
          <p>If you are not an admin, please use the regular <a href="/login" className="underline">login page</a>.</p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AdminLoginPage;
