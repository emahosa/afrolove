import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FaGoogle } from "react-icons/fa";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { checkIfAdminUser } from "@/utils/adminCheck";

interface LoginFormProps {
  onLoginSuccess: () => void;
  onMFARequired: (factorId: string, challengeId: string) => void;
}

export const LoginForm = ({ onLoginSuccess, onMFARequired }: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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
    const isAdminUser = await checkIfAdminUser(email);
    if (isAdminUser) {
      toast.error("Admin users must use the dedicated admin login page");
      return;
    }
    
    setLoading(true);
    try {
      console.log("Login: Attempting regular user login with:", { email });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        toast.error(error.message || "An unexpected error occurred during login");
        setLoading(false);
        return;
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
            onMFARequired(factor.id, challengeData.id);
            setLoading(false);
            return;
          }
        }
      }
      
      if (data.session) {
        onLoginSuccess();
      } else {
        toast.error("Login failed. Please try again.");
        setLoading(false);
      }
    } catch (error) {
      console.error("Login: Error in component:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred during login";
      toast.error(errorMessage);
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
    } catch (error) {
      console.error("Google login error:", error);
      toast.error("An unexpected error occurred during Google login");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <>
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
            <a href="/forgot-password" className="text-sm text-melody-secondary hover:underline">
              Forgot password?
            </a>
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

      <Button 
        variant="outline" 
        className="w-full"
        onClick={handleGoogleLogin}
        disabled={googleLoading}
      >
        <FaGoogle className="mr-2" /> 
        {googleLoading ? "Signing in..." : "Google"}
      </Button>
    </>
  );
};
