
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Loader2 } from "lucide-react";

type MFASetupProps = {
  onComplete?: () => void;
};

const MFA_EXPIRY_MINUTES = 10; // OTP expires after 10 minutes for security

export function MFASetup({ onComplete }: MFASetupProps) {
  const { user } = useAuth();
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  
  // Start MFA enrollment process
  const startEnrollment = async () => {
    if (!user) {
      toast.error("You must be logged in to set up MFA");
      return;
    }
    
    setIsEnrolling(true);
    
    try {
      // Start the enrollment process with Supabase Auth
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'MelodyVerse',
      });
      
      if (error) throw error;
      
      // Store the factor ID for verification step
      setFactorId(data.id);
      
      // Display QR code
      setQrCode(data.totp.qr_code);
      
    } catch (error: any) {
      console.error("MFA enrollment error:", error);
      toast.error("Failed to start MFA setup");
    } finally {
      setIsEnrolling(false);
    }
  };
  
  // Verify the OTP code entered by user
  const verifyOTP = async () => {
    if (!factorId || !verifyCode || verifyCode.length !== 6) {
      toast.error("Please enter the 6-digit code from your authenticator app");
      return;
    }
    
    setIsVerifying(true);
    
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });
      
      if (challengeError) throw challengeError;
      
      setChallengeId(challengeData.id);
      
      const { data, error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      });
      
      if (verifyError) throw verifyError;
      
      toast.success("MFA successfully set up!");
      if (onComplete) onComplete();
      
    } catch (error: any) {
      console.error("MFA verification error:", error);
      toast.error(`Verification failed: ${error.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Multi-Factor Authentication</h3>
        <p className="text-sm text-muted-foreground">
          Set up MFA to add an additional layer of security to your account.
        </p>
        <p className="text-xs text-amber-600">
          Your verification code will expire after {MFA_EXPIRY_MINUTES} minutes for security.
        </p>
      </div>

      {!qrCode ? (
        <Button 
          onClick={startEnrollment} 
          disabled={isEnrolling}
          className="w-full"
        >
          {isEnrolling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Set up MFA
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="border p-4 rounded-md">
            <p className="text-sm mb-4">
              1. Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
            <div className="flex justify-center">
              <img src={qrCode} alt="MFA QR Code" className="max-w-[200px]" />
            </div>
          </div>
          
          <div className="space-y-3">
            <p className="text-sm">2. Enter the 6-digit code from your authenticator app</p>
            <InputOTP 
              maxLength={6}
              value={verifyCode} 
              onChange={setVerifyCode}
              render={({ slots }) => (
                <InputOTPGroup>
                  {slots.map((slot, i) => (
                    <InputOTPSlot key={i} {...slot} index={i} />
                  ))}
                </InputOTPGroup>
              )}
            />
          </div>
          
          <Button 
            onClick={verifyOTP} 
            disabled={isVerifying || verifyCode.length !== 6}
            className="w-full"
          >
            {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify and Enable MFA
          </Button>
        </div>
      )}
    </div>
  );
}
