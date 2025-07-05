import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { FaGoogle, FaApple } from "react-icons/fa";
import { Music } from "lucide-react";
import { OTPVerification } from "@/components/auth/OTPVerification";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  // MFA verification state
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [showMFAVerification, setShowMFAVerification] = useState(false);
  
  const { user, login, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user) {
      console.log("Login: User already logged in, checking role and redirecting");
      
      // If user is admin, redirect to admin panel
      if (isAdmin() || isSuperAdmin()) {
        navigate("/admin", { replace: true });
      } else {
        // Regular user goes to dashboard
        const from = location.state?.from?.pathname || "/dashboard";
        navigate(from, { replace: true });
      }
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
    
    setLoading(true);
    try {
      console.log("Login: Attempting login with:", { email });
      
      const { data, error } = await login(email, password);
      
      if (error) {
        toast.error(error.message || "An unexpected error occurred during login");
        setLoading(false);
        return;
      }
      
      // Check if MFA is required
      if (data.session === null && data.user !== null) {
        const { data: factorData, error: factorError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        
        if (factorError) throw factorError;
        
        if (factorData.currentLevel === 'aal1' && factorData.nextLevel === 'aal2') {
          const { data: enrolledFactors, error: enrolledError } = await supabase.auth.mfa.listFactors();
          
          if (enrolledError) throw enrolledError;
          
          if (enrolledFactors.totp && enrolledFactors.totp.length > 0) {
            const factor = enrolledFactors.totp[0];
            
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
              factorId: factor.id
            });
            
            if (challengeError) throw challengeError;
            
            setFactorId(factor.id);
            setChallengeId(challengeData.id);
            setShowMFAVerification(true);
            setLoading(false);
            return;
          }
        }
      }
      
      if (data.session) {
        toast.success("Login successful!");
        // Navigation will be handled by useEffect
      } else if (!showMFAVerification) {
        toast.error("Login failed. Please try again.");
        setLoading(false);
      }
    } catch (error: any) {
      console.error("Login: Error in component:", error);
      toast.error(error.message || "An unexpected error occurred during login");
      setLoading(false);
    }
  };

  const handleMFAVerified = () => {
    setShowMFAVerification(false);
    toast.success("Login successful!");
    // Navigation will be handled by useEffect when user state updates
  };

  const handleCancelMFA = () => {
    setShowMFAVerification(false);
    supabase.auth.signOut();
  };

  // Show MFA verification screen if needed
  if (showMFAVerification && factorId && challengeId) {
    return (
      <div className="w-full max-w-md p-4 md:p-8 mx-auto">
        <div className="flex items-center justify-center mb-6">
          <Music className="h-10 w-10 text-melody-secondary" />
          <h1 className="text-2xl font-bold ml-2">MelodyVerse</h1>
        </div>
        
        <OTPVerification 
          factorId={factorId}
          challengeId={challengeId}
          onVerified={handleMFAVerified}
          onCancel={handleCancelMFA}
        />
      </div>
    );
  }

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

      <div className="text-center mt-4">
        <Link to="/admin/login" className="text-sm text-muted-foreground hover:underline">
          Admin Login
        </Link>
      </div>
    </div>
  );
};

export default Login;
