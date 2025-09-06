import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { FaGoogle } from "react-icons/fa";
import { OTPVerification } from "@/components/auth/OTPVerification";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AuthPageLayout from "@/layouts/AuthPageLayout";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [showMFAVerification, setShowMFAVerification] = useState(false);
  
  const { user, login, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      if (isAdmin() || isSuperAdmin()) {
        navigate("/admin/login", { replace: true });
        return;
      }
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [user, navigate, location.state, isAdmin, isSuperAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Email and password cannot be empty");
      return;
    }

    // Admin check logic remains the same
    const { data: profileData } = await supabase.from('profiles').select('id').eq('username', email.toLowerCase()).single();
    if (profileData) {
      const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', profileData.id).in('role', ['admin', 'super_admin']);
      if (roleData && roleData.length > 0) {
        toast.error("Admin users must use the dedicated admin login page");
        navigate("/admin/login");
        return;
      }
    }
    
    setLoading(true);
    try {
      const { data, error } = await login(email, password);
      if (error) throw new Error(error.message);

      if (data.session) {
        setTimeout(() => {
          if (isAdmin() || isSuperAdmin()) {
            supabase.auth.signOut();
            toast.error("Admin users must use the dedicated admin login page");
            navigate("/admin/login");
            return;
          }
          toast.success("Login successful!");
          const destination = location.state?.from?.pathname || "/dashboard";
          navigate(destination, { replace: true });
        }, 100);
      } else if (data.user) {
        const { data: factorData, error: factorError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (factorError) throw factorError;
        if (factorData.currentLevel === 'aal1' && factorData.nextLevel === 'aal2') {
          const { data: enrolledFactors, error: enrolledError } = await supabase.auth.mfa.listFactors();
          if (enrolledError) throw enrolledError;
          if (enrolledFactors.totp && enrolledFactors.totp.length > 0) {
            const factor = enrolledFactors.totp[0];
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
            if (challengeError) throw challengeError;
            setFactorId(factor.id);
            setChallengeId(challengeData.id);
            setShowMFAVerification(true);
          }
        }
      } else {
        throw new Error("Login failed. Please try again.");
      }
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred.");
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
      toast.error("Failed to login with Google: " + error.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleMFAVerified = () => {
    setShowMFAVerification(false);
    toast.success("Login successful!");
    const destination = location.state?.from?.pathname || "/dashboard";
    navigate(destination, { replace: true });
  };

  if (showMFAVerification && factorId && challengeId) {
    return (
      <AuthPageLayout>
        <div className="w-full max-w-md glass-surface p-8 text-center">
            <h2 className="text-xl font-bold mb-4">Enter Verification Code</h2>
            <OTPVerification
              factorId={factorId}
              challengeId={challengeId}
              onVerified={handleMFAVerified}
              onCancel={() => setShowMFAVerification(false)}
            />
        </div>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout>
      <div className="w-full max-w-md glass-surface p-8">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-semibold mb-2">Welcome Back</h2>
          <p className="text-white/70">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="flex justify-between mb-1">
              <Label htmlFor="password" className="text-white/70">Password</Label>
              <Link to="/forgot-password" className="text-sm text-white/50 hover:text-white hover:underline">
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
              className="bg-black/20 border-white/10 text-white placeholder-white/40 focus:border-white/30 focus:ring-white/20"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
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
          {googleLoading ? "Signing in..." : "Google"}
        </Button>

        <p className="text-center mt-6 text-sm text-white/70">
          Don't have an account?{" "}
          <Link to="/register" className="text-white hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </AuthPageLayout>
  );
};

export default Login;
