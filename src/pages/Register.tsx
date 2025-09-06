import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
        toast.success("Registration successful! Welcome to Afroverse!");
        navigate("/dashboard");
      } else {
        // The register function in AuthContext should handle specific error toasts.
        // A generic fallback.
        toast.error("Registration failed. An account with this email may already exist.");
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
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard` }
      });
      if (error) toast.error("Failed to sign up with Google: " + error.message);
    } catch (error: any) {
      toast.error("An unexpected error occurred during Google signup");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthPageLayout>
      <div className="glass-surface w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">Create Your Account</h1>
          <p className="text-white/70 mt-2">Join Afroverse and start creating music</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white/70">Full Name</Label>
            <Input id="name" type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white/70">Email</Label>
            <Input id="email" type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white/70">Password</Label>
            <Input id="password" type="password" placeholder="•••••••• (min. 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-white/70">Confirm Password</Label>
            <Input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          <button type="submit" className="w-full glass-btn text-lg py-3" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-black/50 text-white/70 rounded-full backdrop-blur-sm">
              OR
            </span>
          </div>
        </div>

        <button className="w-full glass-btn" onClick={handleGoogleLogin} disabled={googleLoading}>
          <FaGoogle className="mr-2" />
          {googleLoading ? "Signing up..." : "Continue with Google"}
        </button>

        <p className="text-center mt-6 text-sm text-white/70">
          Already have an account?{" "}
          <Link to="/login" className="text-white hover:underline font-medium">
            Sign In
          </Link>
        </p>
      </div>
    </AuthPageLayout>
  );
};

export default Register;
