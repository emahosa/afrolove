
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { FaGoogle } from "react-icons/fa";
import { Music } from "lucide-react";
import { OTPVerification } from "@/components/auth/OTPVerification";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AuthPageLayout from "@/layouts/AuthPageLayout";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  // MFA verification state
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [showMFAVerification, setShowMFAVerification] = useState(false);
  
  const { user, login, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to dashboard if already logged in (but check if admin first)
  useEffect(() => {
    if (user) {
      console.log("Login: User already logged in, checking admin status");
      
      // If user is admin, redirect them to admin login
      if (isAdmin() || isSuperAdmin()) {
        console.log("Login: Admin user detected, redirecting to admin login");
        toast.error("Admin users must use the dedicated admin login page");
        navigate("/admin/login", { replace: true });
        return;
      }
      
      console.log("Login: Regular user logged in, redirecting to dashboard");
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [user, navigate, location.state, isAdmin, isSuperAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("Email cannot be empty");
      return;
    }

    if (!password.trim()) {
      toast.error("Password cannot be empty");
      return;
    }

    // Check if this is an admin email before attempting login
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', email.toLowerCase())
      .single();

    if (profileData) {
      // Check if this user has admin roles
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profileData.id)
        .in('role', ['admin', 'super_admin']);

      if (roleData && roleData.length > 0) {
        toast.error("Admin users must use the dedicated admin login page");
        navigate("/admin/login");
        return;
      }
    }
    
    setLoading(true);
    try {
      console.log("Login: Attempting regular user login with:", { email });
      
      const { data, error } = await login(email, password);
      
      if (error) {
        toast.error(error.message || "An unexpected error occurred during login");
        setLoading(false);
        return;
      }
      
      // Double-check after login to ensure no admin got through
      if (data.session) {
        // Wait a moment for auth context to update
        setTimeout(() => {
          if (isAdmin() || isSuperAdmin()) {
            console.log("Login: Admin detected after login, logging out and redirecting");
            supabase.auth.signOut();
            toast.error("Admin users must use the dedicated admin login page");
            navigate("/admin/login");
            return;
          }
          
          toast.success("Login successful!");
          let destination = "/dashboard";
          if (location.state?.from?.pathname) {
            destination = location.state.from.pathname;
          }
          console.log("Login: Regular user login successful, redirecting to:", destination);
          navigate(destination, { replace: true });
        }, 100);
      }
      
      // MFA handling logic
      if (data.session === null && data.user !== null) {
        // This means MFA is required - check for enrolled factors
        const { data: factorData, error: factorError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        
        if (factorError) throw factorError;
        
        if (factorData.currentLevel === 'aal1' && factorData.nextLevel === 'aal2') {
          // User has MFA enabled, get all enrolled factors
          const { data: enrolledFactors, error: enrolledError } = await supabase.auth.mfa.listFactors();
          
          if (enrolledError) throw enrolledError;
          
          if (enrolledFactors.totp && enrolledFactors.totp.length > 0) {
            // TOTP factor exists, create a challenge
            const factor = enrolledFactors.totp[0];
            
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
              factorId: factor.id
            });
            
            if (challengeError) throw challengeError;
            
            // Store factor and challenge IDs and show MFA verification
            setFactorId(factor.id);
            setChallengeId(challengeData.id);
            setShowMFAVerification(true);
            setLoading(false);
            return;
          }
        }
      }
      
      if (!data.session && !showMFAVerification) {
        toast.error("Login failed. Please try again.");
        setLoading(false);
      }
    } catch (error: any) {
      console.error("Login: Error in component:", error);
      toast.error(error.message || "An unexpected error occurred during login");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      console.log("Attempting Google login...");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) {
        console.error("Google login error:", error);
        toast.error("Failed to login with Google: " + error.message);
      }
    } catch (error: any) {
      console.error("Google login error:", error);
      toast.error("An unexpected error occurred during Google login");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleMFAVerified = () => {
    setShowMFAVerification(false);
    toast.success("Login successful!");
    
    // After MFA is verified, the session is active and context is updated via onAuthStateChange.
    // We can now navigate.
    let destination = "/dashboard"; // Default to user dashboard
    if (location.state?.from?.pathname) {
      destination = location.state.from.pathname;
    }
    navigate(destination, { replace: true });
  };

  const handleCancelMFA = () => {
    setShowMFAVerification(false);
    // Sign out the incomplete session
    supabase.auth.signOut();
  };

  // Show MFA verification screen if needed
  if (showMFAVerification && factorId && challengeId) {
    return (
      <AuthPageLayout>
        <div className="w-full max-w-md glass-surface text-center">
            <div className="flex items-center justify-center mb-6">
                <Music className="h-8 w-8 text-white" />
                <h1 className="text-2xl font-bold ml-2 text-white">Afroverse</h1>
            </div>
            <h2 className="text-xl font-bold mb-4">Enter Verification Code</h2>
            <OTPVerification
            factorId={factorId}
            challengeId={challengeId}
            onVerified={handleMFAVerified}
            onCancel={handleCancelMFA}
            />
        </div>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout>
      <div className="w-full max-w-md glass-surface">
        <div className="flex items-center justify-center mb-6">
            <Music className="h-8 w-8 text-white" />
            <h1 className="text-2xl font-bold ml-2 text-white">Afroverse</h1>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-3xl font-semibold mb-2 text-white">Welcome Back</h2>
          <p className="text-white/70">Sign in to continue to Afroverse</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-white/80 text-left block mb-1">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <Label htmlFor="password"  className="text-white/80">Password</Label>
              <Link to="/forgot-password" className="text-sm text-white/80 hover:underline">
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
            className="w-full font-bold"
            disabled={loading}
          >
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
          variant="outline"
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

        <p className="text-center mt-4 text-xs text-white/50">
          Admin users should use the{" "}
          <Link to="/admin/login" className="text-white/80 hover:underline">
            dedicated admin login
          </Link>
        </p>
      </div>
    </AuthPageLayout>
  );
};

export default Login;
