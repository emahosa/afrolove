
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { FaGoogle } from "react-icons/fa";
import { Music } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AuthPageLayout from "@/layouts/AuthPageLayout";

const Login = () => {
  const [googleLoading, setGoogleLoading] = useState(false);
  
  const { user, isAdmin, isSuperAdmin } = useAuth();
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

  return (
    <AuthPageLayout>
      <div className="w-full max-w-md bg-white/5 p-8 rounded-xl border border-white/10 backdrop-blur-sm">
        <div className="flex items-center justify-center mb-6">
            <Music className="h-8 w-8 text-dark-purple" />
            <h1 className="text-2xl font-bold ml-2 text-white">Afromelody</h1>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-3xl font-semibold mb-2 text-white">Welcome Back</h2>
          <p className="text-gray-400">Sign in to continue to Afromelody</p>
        </div>

        <Button 
          variant="outline"
          className="w-full bg-transparent border-white/30 hover:bg-white/10 text-white"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
        >
          <FaGoogle className="mr-2" />
          {googleLoading ? "Signing in..." : "Continue with Google"}
        </Button>
      </div>
    </AuthPageLayout>
  );
};

export default Login;
