
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { FaGoogle, FaApple } from "react-icons/fa";
import { Music } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const ADMIN_EMAIL = "ellaadahosa@gmail.com";
const ADMIN_PASSWORD = "Admin123!";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState("user");
  
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (userType === "admin") {
      setEmail(ADMIN_EMAIL);
      setPassword(ADMIN_PASSWORD);
    } else {
      setEmail("");
      setPassword("");
    }
  }, [userType]);

  useEffect(() => {
    if (user) {
      console.log("Login: User already logged in, redirecting...");
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [user, navigate, location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      toast.error(email.trim() ? "Password cannot be empty" : "Email cannot be empty");
      return;
    }
    
    setLoading(true);
    try {
      const success = await login(email, password);
      // Navigation is handled by AuthLayout and ProtectedRoute reacting to the 'user' state change.
      // If login is successful, the `user` object in AuthContext will be populated,
      // and the app will automatically navigate away from the login page.
      if (!success) {
        // If login fails, stay on the page and show error (handled in context).
        // The button's loading state should be reset.
        setLoading(false);
      }
    } catch (error) {
      // This catch is for unexpected errors in the login component itself.
      console.error("Login component error:", error);
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-4 md:p-0 mx-auto">
      <div className="md:hidden flex items-center justify-center mb-6">
        <Music className="h-10 w-10 text-melody-secondary" />
        <h1 className="text-2xl font-bold ml-2">MelodyVerse</h1>
      </div>
      
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold mb-2">Welcome Back</h2>
        <p className="text-muted-foreground">Sign in to continue to MelodyVerse</p>
      </div>

      <Tabs value={userType} onValueChange={setUserType} className="mb-6">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="user">User Login</TabsTrigger>
          <TabsTrigger value="admin">Admin Login</TabsTrigger>
        </TabsList>
      </Tabs>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder="you@gmail.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-sm text-melody-secondary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input 
            id="password" 
            type="password" 
            placeholder="••••••••" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <Button 
          type="submit" 
          className="w-full bg-melody-secondary hover:bg-melody-secondary/90"
          disabled={loading}
        >
          {loading ? "Signing in..." : userType === "admin" ? "Sign In as Admin" : "Sign In"}
        </Button>

        {userType === "admin" && (
          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm text-amber-800">
              <strong>Admin credentials:</strong><br />
              Email: {ADMIN_EMAIL}<br />
              Password: {ADMIN_PASSWORD}
            </p>
          </div>
        )}
      </form>

      {userType === "user" && (
        <>
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-background text-muted-foreground">
                OR CONTINUE WITH
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="w-full">
              <FaGoogle className="mr-2" /> Google
            </Button>
            <Button variant="outline" className="w-full">
              <FaApple className="mr-2" /> Apple
            </Button>
          </div>
        </>
      )}

      <p className="text-center mt-8 text-sm">
        Don't have an account?{" "}
        {userType === "admin" ? (
          <Link to="/register/admin" className="text-melody-secondary hover:underline font-medium">
            Create Admin Account
          </Link>
        ) : (
          <Link to="/register" className="text-melody-secondary hover:underline font-medium">
            Sign up
          </Link>
        )}
      </p>
    </div>
  );
};

export default Login;
