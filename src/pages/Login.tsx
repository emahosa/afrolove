
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { FaGoogle, FaApple } from "react-icons/fa";
import { Music } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AuthTestPanel from "@/components/AuthTestPanel";
import { OTPVerification } from "@/components/auth/OTPVerification";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Admin credentials constants - update to use the correct admin email
const ADMIN_EMAIL = "ellaadahosa@gmail.com";
const ADMIN_PASSWORD = "Admin123!";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState("user");
  // MFA verification state
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [showMFAVerification, setShowMFAVerification] = useState(false);
  
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-fill admin credentials when on admin tab
  useEffect(() => {
    if (userType === "admin") {
      setEmail(ADMIN_EMAIL);
      setPassword(ADMIN_PASSWORD);
    } else {
      setEmail("");
      setPassword("");
    }
  }, [userType]);

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user) {
      console.log("Login: User already logged in, redirecting to dashboard");
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [user, navigate, location.state]);

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
      console.log("Login: Attempting login with:", { email, userType });
      const isAdminLogin = userType === "admin";
      
      // First attempt to authenticate with email/password
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        throw error;
      }
      
      // Check if MFA is required
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
      
      // If we reach here, MFA was not required or has been completed
      const success = await login(email, password, isAdminLogin);
      
      if (success) {
        // Get the intended destination or default to dashboard/admin based on login type
        let destination = isAdminLogin ? "/admin" : "/dashboard";
        if (location.state?.from?.pathname) {
          destination = location.state.from.pathname;
        }
        console.log("Login: Login successful, redirecting to:", destination);
        navigate(destination, { replace: true });
      } else {
        setLoading(false);
      }
    } catch (error: any) {
      console.error("Login: Error in component:", error);
      toast.error(error.message || "An unexpected error occurred during login");
      setLoading(false);
    }
  };

  const handleMFAVerified = async () => {
    setShowMFAVerification(false);
    
    // After MFA is verified, complete the login process
    const isAdminLogin = userType === "admin";
    const success = await login(email, password, isAdminLogin);
    
    if (success) {
      let destination = isAdminLogin ? "/admin" : "/dashboard";
      if (location.state?.from?.pathname) {
        destination = location.state.from.pathname;
      }
      navigate(destination, { replace: true });
    }
  };

  const handleCancelMFA = () => {
    setShowMFAVerification(false);
    // Sign out the incomplete session
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
    <div className="w-full max-w-3xl p-4 md:p-0">
      <div className="md:hidden flex items-center justify-center mb-6">
        <Music className="h-10 w-10 text-melody-secondary" />
        <h1 className="text-2xl font-bold ml-2">MelodyVerse</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
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
        
        <div>
          <AuthTestPanel />
        </div>
      </div>
    </div>
  );
};

export default Login;
