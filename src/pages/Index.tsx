
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Music, Sparkles, Users, Mic } from "lucide-react";
import { Link } from "react-router-dom";
import { FloatingNotes } from "@/components/3d/FloatingNotes";

const Index = () => {
  const { user, loading, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to appropriate dashboard
  useEffect(() => {
    if (!loading && user) {
      console.log("Index: User is authenticated, checking role for redirect");
      
      // Redirect admins to admin panel
      if (isAdmin() || isSuperAdmin()) {
        console.log("Index: Admin user detected, redirecting to admin panel");
        navigate("/admin", { replace: true });
        return;
      }
      
      // Redirect regular users to user dashboard
      console.log("Index: Regular user detected, redirecting to dashboard");
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate, isAdmin, isSuperAdmin]);

  // Show loading state while checking authentication
  if (loading) {
    console.log("Index: Showing loading state");
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-background via-background to-purple-900/20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        <div className="ml-3 text-white">Loading...</div>
      </div>
    );
  }

  // Show landing page for non-authenticated users
  console.log("Index: Showing landing page for non-authenticated user");
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-900/20 relative overflow-hidden">
      <FloatingNotes />
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        <header className="text-center mb-16">
          <div className="flex items-center justify-center mb-6 animate-fade-in">
            <Music className="h-16 w-16 text-purple-400 mr-4 animate-pulse" />
            <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
              Afroverse
            </h1>
          </div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto animate-fade-in delay-200">
            Create amazing songs and instrumentals with the power of AI. Generate music in various genres with just a few clicks.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="text-center p-6 rounded-lg bg-gray-900/50 border border-gray-800 backdrop-blur-sm hover:bg-gray-900/70 transition-all duration-300 hover:scale-105 animate-fade-in delay-300">
            <Sparkles className="h-12 w-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2 text-white">AI Music Generation</h3>
            <p className="text-gray-400">
              Generate unique songs and instrumentals using advanced AI technology
            </p>
          </div>
          
          <div className="text-center p-6 rounded-lg bg-gray-900/50 border border-gray-800 backdrop-blur-sm hover:bg-gray-900/70 transition-all duration-300 hover:scale-105 animate-fade-in delay-400">
            <Users className="h-12 w-12 text-purple-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2 text-white">Community Contests</h3>
            <p className="text-gray-400">
              Participate in music contests and showcase your AI-generated creations
            </p>
          </div>
          
          <div className="text-center p-6 rounded-lg bg-gray-900/50 border border-gray-800 backdrop-blur-sm hover:bg-gray-900/70 transition-all duration-300 hover:scale-105 animate-fade-in delay-500">
            <Mic className="h-12 w-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2 text-white">Voice Cloning</h3>
            <p className="text-gray-400">
              Clone voices and create personalized music with custom vocals
            </p>
          </div>
        </div>

        <div className="text-center animate-fade-in delay-600">
          <div className="space-x-4">
            <Link to="/register">
              <Button 
                size="lg" 
                className="bg-purple-600 hover:bg-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-purple-500/25"
              >
                Get Started
              </Button>
            </Link>
            <Link to="/login">
              <Button 
                size="lg" 
                variant="outline" 
                className="border-purple-500 text-purple-400 hover:bg-purple-600 hover:text-white transform hover:scale-105 transition-all duration-200"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
