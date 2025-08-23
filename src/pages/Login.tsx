
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { LoginMFAWrapper } from "@/components/auth/LoginMFAWrapper";
import { FloatingNotes } from "@/components/3d/FloatingNotes";

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-900/20 relative overflow-hidden">
      <FloatingNotes />
      <div className="relative z-10 min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md p-8 bg-gray-900/80 backdrop-blur-sm rounded-xl border border-gray-800 shadow-2xl animate-scale-in">
          <LoginMFAWrapper />
        </div>
      </div>
    </div>
  );
};

export default Login;
