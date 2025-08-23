
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { LoginMFAWrapper } from "@/components/auth/LoginMFAWrapper";
import { FloatingNotes } from "@/components/3d/FloatingNotes";
import { Music, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Login = () => {
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

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 3D Floating Notes Background */}
      <FloatingNotes />
      
      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="p-6">
          <Link to="/">
            <Button variant="ghost" size="sm" className="group">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Login Section */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-md">
            {/* Logo and Title */}
            <div className="text-center mb-8 animate-fade-in">
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <Music className="h-12 w-12 text-primary animate-pulse" />
                  <div className="absolute inset-0 h-12 w-12 text-primary/30 animate-ping"></div>
                </div>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
                Afroverse
              </h1>
              <p className="text-muted-foreground">Welcome back to your music studio</p>
            </div>

            {/* Login Form */}
            <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-xl animate-scale-in">
              <LoginMFAWrapper />
            </div>

            {/* Footer Links */}
            <div className="text-center mt-6 animate-fade-in">
              <p className="text-muted-foreground">
                Don't have an account?{" "}
                <Link 
                  to="/register" 
                  className="text-primary hover:text-primary/80 font-medium transition-colors hover:underline"
                >
                  Sign up here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
