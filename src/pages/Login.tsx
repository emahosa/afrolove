
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { FaGoogle, FaApple } from "react-icons/fa";
import { Music } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(email, password);
    if (success) {
      navigate("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md p-4 md:p-0">
      <div className="md:hidden flex items-center justify-center mb-6">
        <Music className="h-10 w-10 text-melody-secondary" />
        <h1 className="text-2xl font-bold ml-2">MelodyVerse</h1>
      </div>
      
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Welcome Back</h2>
        <p className="text-muted-foreground">Sign in to continue to MelodyVerse</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder="you@example.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
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
          />
        </div>
        <Button 
          type="submit" 
          className="w-full bg-melody-secondary hover:bg-melody-secondary/90"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </form>

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

      <p className="text-center mt-8 text-sm">
        Don't have an account?{" "}
        <Link to="/register" className="text-melody-secondary hover:underline font-medium">
          Sign up
        </Link>
      </p>
    </div>
  );
};

export default Login;
