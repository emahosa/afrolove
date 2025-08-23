
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { LoginMFAWrapper } from "@/components/auth/LoginMFAWrapper";

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

  return <LoginMFAWrapper />;
};

export default Login;
