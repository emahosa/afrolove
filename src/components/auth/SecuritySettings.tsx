
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MFASetup } from "./MFASetup";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";

export function SecuritySettings() {
  const { user } = useAuth();
  const [hasMFA, setHasMFA] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showMFASetup, setShowMFASetup] = useState(false);

  // Check if user has MFA enabled
  useEffect(() => {
    const checkMFAStatus = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const { data, error } = await supabase.auth.mfa.listFactors();
        
        if (error) throw error;
        
        // Check if user has any TOTP factors enrolled
        setHasMFA(data.totp && data.totp.length > 0);
      } catch (error) {
        console.error("Error checking MFA status:", error);
        toast.error("Failed to check MFA status");
      } finally {
        setIsLoading(false);
      }
    };
    
    checkMFAStatus();
  }, [user]);

  const handleDisableMFA = async () => {
    if (!user || !hasMFA) return;
    
    try {
      setIsLoading(true);
      
      // Get all factors
      const { data, error } = await supabase.auth.mfa.listFactors();
      
      if (error) throw error;
      
      // Find TOTP factors and unenroll them
      if (data.totp && data.totp.length > 0) {
        for (const factor of data.totp) {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
        
        setHasMFA(false);
        toast.success("MFA has been disabled");
      }
    } catch (error: any) {
      console.error("Error disabling MFA:", error);
      toast.error(`Failed to disable MFA: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMFASetupComplete = () => {
    setShowMFASetup(false);
    setHasMFA(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Security Settings</CardTitle>
            <CardDescription>Manage your account security settings</CardDescription>
          </div>
          {hasMFA ? 
            <ShieldCheck className="w-6 h-6 text-green-500" /> : 
            <ShieldAlert className="w-6 h-6 text-amber-500" />
          }
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {showMFASetup ? (
          <MFASetup onComplete={handleMFASetupComplete} />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Multi-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Secure your account with an authenticator app
                </p>
              </div>
              <div className="flex items-center">
                <Switch 
                  checked={hasMFA} 
                  disabled={isLoading} 
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setShowMFASetup(true);
                    } else {
                      handleDisableMFA();
                    }
                  }}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Password Requirements</h4>
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li>Minimum 8 characters</li>
                <li>At least one uppercase letter</li>
                <li>At least one number</li>
                <li>At least one special character</li>
              </ul>
            </div>
            
            <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Shield className="h-5 w-5 text-amber-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">Security Recommendation</h3>
                  <div className="mt-2 text-sm text-amber-700">
                    <p>
                      We recommend enabling Multi-Factor Authentication to protect your account.
                      Your verification codes will only be valid for 10 minutes for optimal security.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      {!showMFASetup && (
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            Last security check: {new Date().toLocaleDateString()}
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
