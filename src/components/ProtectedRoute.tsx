
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ProtectedRoute = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="audio-wave">
          <div className="audio-wave-bar h-5 animate-wave1"></div>
          <div className="audio-wave-bar h-8 animate-wave2"></div>
          <div className="audio-wave-bar h-4 animate-wave3"></div>
          <div className="audio-wave-bar h-6 animate-wave4"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
