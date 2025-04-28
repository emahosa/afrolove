
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator
} from "@/components/ui/input-otp";
import { Loader2 } from "lucide-react";

type OTPVerificationProps = {
  factorId: string;
  challengeId: string;
  onVerified: () => void;
  onCancel: () => void;
};

export function OTPVerification({ 
  factorId, 
  challengeId, 
  onVerified,
  onCancel
}: OTPVerificationProps) {
  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (otpCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setIsVerifying(true);

    try {
      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: otpCode,
      });

      if (error) throw error;

      if (data.challenge_verified) {
        toast.success("Verification successful!");
        onVerified();
      } else {
        toast.error("Invalid verification code. Please try again.");
      }
    } catch (error: any) {
      console.error("OTP verification error:", error);
      toast.error(`Verification failed: ${error.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Verify Your Identity</h3>
        <p className="text-sm text-muted-foreground">
          Enter the verification code from your authenticator app.
        </p>
        <p className="text-xs text-amber-600">
          Verification codes expire after 10 minutes for security.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="otp">Verification Code</Label>
          <InputOTP
            id="otp"
            maxLength={6}
            value={otpCode}
            onChange={setOtpCode}
            render={({ slots }) => (
              <InputOTPGroup>
                {slots.map((slot, index) => (
                  <InputOTPSlot key={index} {...slot} />
                ))}
              </InputOTPGroup>
            )}
          />
        </div>

        <div className="flex flex-col space-y-2">
          <Button 
            onClick={handleVerify} 
            disabled={isVerifying || otpCode.length !== 6}
            className="w-full"
          >
            {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify
          </Button>
          
          <Button 
            variant="ghost"
            onClick={onCancel}
            disabled={isVerifying}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
