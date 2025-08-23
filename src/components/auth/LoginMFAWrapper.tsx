
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Music } from "lucide-react";
import { OTPVerification } from "@/components/auth/OTPVerification";
import { LoginForm } from "@/components/auth/LoginForm";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const LoginMFAWrapper = () => {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [showMFAVerification, setShowMFAVerification] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  const handleLoginSuccess = () => {
    toast.success("Login successful!");
    let destination = "/dashboard";
    if (location.state?.from?.pathname) {
      destination = location.state.from.pathname;
    }
    console.log("Login: Regular user login successful, redirecting to:", destination);
    navigate(destination, { replace: true });
  };

  const handleMFARequired = (newFactorId: string, newChallengeId: string) => {
    setFactorId(newFactorId);
    setChallengeId(newChallengeId);
    setShowMFAVerification(true);
  };

  const handleMFAVerified = () => {
    setShowMFAVerification(false);
    handleLoginSuccess();
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
    <div className="w-full max-w-md p-4 md:p-0 mx-auto">
      <div className="md:hidden flex items-center justify-center mb-6">
        <Music className="h-10 w-10 text-melody-secondary" />
        <h1 className="text-2xl font-bold ml-2">MelodyVerse</h1>
      </div>
      
      <LoginForm 
        onLoginSuccess={handleLoginSuccess}
        onMFARequired={handleMFARequired}
      />

      <p className="text-center mt-8 text-sm">
        Don't have an account?{" "}
        <a href="/register" className="text-melody-secondary hover:underline font-medium">
          Sign up
        </a>
      </p>
      
      <p className="text-center mt-4 text-xs text-muted-foreground">
        Admin users should use the{" "}
        <a href="/admin/login" className="text-melody-secondary hover:underline">
          dedicated admin login
        </a>
      </p>
    </div>
  );
};
