
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { FaGoogle } from "react-icons/fa";
import { Music } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AuthPageLayout from "@/layouts/AuthPageLayout";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    
    try {
      console.log("Register: Attempting to register user with:", { name, email });
      
      const success = await register(name, email, password);
      
      if (success) {
        toast.success("Registration successful! Welcome to MelodyVerse!");
        navigate("/dashboard");
      } else {
        toast.error("Registration failed. Please try again.");
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      console.log("Attempting Google signup...");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) {
        console.error("Google signup error:", error);
        toast.error("Failed to sign up with Google: " + error.message);
      }
    } catch (error: any) {
      console.error("Google signup error:", error);
      toast.error("An unexpected error occurred during Google signup");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthPageLayout>
      <div className="w-full max-w-md bg-white/5 p-8 rounded-xl border border-white/10 backdrop-blur-sm">
        <div className="flex items-center justify-center mb-6">
            <Music className="h-8 w-8 text-dark-purple" />
            <h1 className="text-2xl font-bold ml-2 text-white">Afroverse</h1>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-3xl font-semibold mb-2 text-white">Create Account</h2>
          <p className="text-gray-400">Join Afroverse and start creating music</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-gray-300 text-left block mb-1">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-black/20 border-white/20 text-white placeholder-gray-500"
            />
          </div>
          <div>
            <Label htmlFor="email" className="text-gray-300 text-left block mb-1">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-black/20 border-white/20 text-white placeholder-gray-500"
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-gray-300 text-left block mb-1">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-black/20 border-white/20 text-white placeholder-gray-500"
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword" className="text-gray-300 text-left block mb-1">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="bg-black/20 border-white/20 text-white placeholder-gray-500"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-deep-purple font-bold"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Sign Up"}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/20"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-gray-900/50 text-gray-400 rounded-full">
              OR CONTINUE WITH
            </span>
          </div>
        </div>

        <Button 
          variant="outline"
          className="w-full bg-transparent border-white/30 hover:bg-white/10 text-white"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
        >
          <FaGoogle className="mr-2" />
          {googleLoading ? "Signing up..." : "Google"}
        </Button>

        <p className="text-center mt-6 text-sm text-gray-400">
          Already have an account?{" "}
          <Link to="/login" className="text-dark-purple hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </AuthPageLayout>
  );
};

export default Register;
