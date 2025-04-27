
import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Music } from "lucide-react";

const AuthLayout = () => {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

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
