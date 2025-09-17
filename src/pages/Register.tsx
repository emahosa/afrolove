
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FaGoogle } from "react-icons/fa";
import { Music } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AuthPageLayout from "@/layouts/AuthPageLayout";

const Register = () => {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    if (!agreedToTerms) {
      toast.error("You must agree to the Terms and Conditions to sign up.");
      return;
    }

    setGoogleLoading(true);
    try {
      console.log("Attempting Google signup...");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${import.meta.env.VITE_SITE_URL}/dashboard`
        }
      });

      if (error) {
        console.error("Google signup error:", error);
        toast.error("Failed to sign up with Google: " + error.message);
      }
    } catch (error: any) {
      console.error("Google signup error:", error);
      toast.error("An unexpected error occurred during Google signup");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthPageLayout>
      <div className="w-full max-w-md bg-white/5 p-8 rounded-xl border border-white/10 backdrop-blur-sm">
        <div className="flex items-center justify-center mb-6">
            <Music className="h-8 w-8 text-dark-purple" />
            <h1 className="text-2xl font-bold ml-2 text-white">Afromelody</h1>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-3xl font-semibold mb-2 text-white">Create Account</h2>
          <p className="text-gray-400">Join Afromelody and start creating music</p>
        </div>

        <div className="flex items-center space-x-2 my-4">
          <Checkbox
            id="terms"
            checked={agreedToTerms}
            onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
            className="border-white/50 data-[state=checked]:bg-dark-purple"
          />
          <Label htmlFor="terms" className="text-sm text-gray-400">
            I agree to the{" "}
            <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-dark-purple hover:underline">
              Terms and Conditions
            </Link>
          </Label>
        </div>

        <Button 
          variant="outline"
          className="w-full bg-transparent border-white/30 hover:bg-white/10 text-white mt-6"
          onClick={handleGoogleLogin}
          disabled={googleLoading || !agreedToTerms}
        >
          <FaGoogle className="mr-2" />
          {googleLoading ? "Signing up..." : "Continue with Google"}
        </Button>

        <p className="text-center mt-6 text-sm text-gray-400">
          Already have an account?{" "}
          <Link to="/login" className="text-dark-purple hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </AuthPageLayout>
  );
};

export default Register;
