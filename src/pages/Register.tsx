import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { FaGoogle } from "react-icons/fa";
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
      const success = await register(name, email, password);
      if (success) {
        toast.success("Registration successful! Welcome!");
        navigate("/dashboard");
      } else {
        throw new Error("Registration failed. The email might already be in use.");
      }
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/dashboard` }});
      if (error) throw error;
    } catch (error: any) {
      toast.error("Failed to sign up with Google: " + error.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthPageLayout>
      <div className="w-full max-w-md glass-surface p-8">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-semibold mb-2">Create Account</h2>
          <p className="text-white/70">Join and start creating</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-left block mb-1 text-white/70">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-black/20 border-white/10 text-white placeholder-white/40 focus:border-white/30 focus:ring-white/20"
            />
          </div>
          <div>
            <Label htmlFor="email" className="text-left block mb-1 text-white/70">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-black/20 border-white/10 text-white placeholder-white/40 focus:border-white/30 focus:ring-white/20"
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-left block mb-1 text-white/70">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="•••••••• (min. 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-black/20 border-white/10 text-white placeholder-white/40 focus:border-white/30 focus:ring-white/20"
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword" className="text-left block mb-1 text-white/70">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="bg-black/20 border-white/10 text-white placeholder-white/40 focus:border-white/30 focus:ring-white/20"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Sign Up"}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/20"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-black/50 text-white/70 rounded-full">
              OR CONTINUE WITH
            </span>
          </div>
        </div>

        <Button 
          className="w-full"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
        >
          <FaGoogle className="mr-2" />
          {googleLoading ? "Signing up..." : "Google"}
        </Button>

        <p className="text-center mt-6 text-sm text-white/70">
          Already have an account?{" "}
          <Link to="/login" className="text-white hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </AuthPageLayout>
  );
};

export default Register;
