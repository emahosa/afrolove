
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Music } from "lucide-react";

const AuthLayout = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melody-secondary"></div>
      </div>
    );
  }

  // Redirect to dashboard if already logged in
  if (user) {
    // Use the intended destination or default to dashboard
    const destination = location.state?.from?.pathname || "/dashboard";
    console.log("AuthLayout: User is logged in, redirecting to:", destination);
    return <Navigate to={destination} replace />;
  }

  // Show auth layout for non-authenticated users
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="hidden md:flex md:w-1/2 bg-melody-primary p-8 flex-col justify-center items-center">
        <div className="max-w-md text-center">
          <Music size={60} className="mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">MelodyVerse AI</h1>
          <p className="text-xl mb-6">
            Create amazing songs and instrumentals with the power of AI
          </p>
          <div className="grid-pattern rounded-xl h-64 w-full"></div>
        </div>
      </div>
      <div className="w-full md:w-1/2 p-8 flex items-center justify-center">
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
