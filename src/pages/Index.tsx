
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Music, Sparkles, Users, Mic, ArrowRight } from "lucide-react";
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
      <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          <div className="text-lg font-medium">Loading...</div>
        </div>
      </div>
    );
  }

  // Show landing page for non-authenticated users
  console.log("Index: Showing landing page for non-authenticated user");
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 3D Floating Notes Background */}
      <FloatingNotes />
      
      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Hero Section */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-4xl mx-auto">
            {/* Logo and Title */}
            <div className="mb-8 animate-fade-in">
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <Music className="h-20 w-20 text-primary animate-pulse" />
                  <div className="absolute inset-0 h-20 w-20 text-primary/30 animate-ping"></div>
                </div>
              </div>
              <h1 className="text-7xl md:text-8xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent mb-4">
                Afroverse
              </h1>
              <div className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Create amazing songs and instrumentals with the power of AI
              </div>
            </div>

            {/* Central CTA Buttons */}
            <div className="mb-16 animate-scale-in">
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link to="/register" className="group">
                  <Button 
                    size="lg" 
                    className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transform hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl"
                  >
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/login" className="group">
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="text-lg px-8 py-6 border-2 border-primary/30 bg-background/80 backdrop-blur-sm hover:bg-primary/5 hover:border-primary/50 transform hover:scale-105 transition-all duration-300"
                  >
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              <div className="group bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-8 hover:bg-card/90 hover:border-primary/30 transform hover:scale-105 transition-all duration-500 hover:shadow-xl">
                <div className="mb-6">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center group-hover:from-primary/30 group-hover:to-accent/30 transition-all duration-300">
                    <Sparkles className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3">AI Music Generation</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Generate unique songs and instrumentals using advanced AI technology
                </p>
              </div>
              
              <div className="group bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-8 hover:bg-card/90 hover:border-primary/30 transform hover:scale-105 transition-all duration-500 hover:shadow-xl">
                <div className="mb-6">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-r from-accent/20 to-primary/20 rounded-2xl flex items-center justify-center group-hover:from-accent/30 group-hover:to-primary/30 transition-all duration-300">
                    <Users className="h-8 w-8 text-accent group-hover:scale-110 transition-transform" />
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3">Community Contests</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Participate in music contests and showcase your AI-generated creations
                </p>
              </div>
              
              <div className="group bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-8 hover:bg-card/90 hover:border-primary/30 transform hover:scale-105 transition-all duration-500 hover:shadow-xl">
                <div className="mb-6">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center group-hover:from-primary/30 group-hover:to-accent/30 transition-all duration-300">
                    <Mic className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3">Voice Cloning</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Clone voices and create personalized music with custom vocals
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-8 text-muted-foreground">
          <p>&copy; 2024 Afroverse AI. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
