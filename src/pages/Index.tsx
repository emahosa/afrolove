
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Music, Sparkles, Users, Mic } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      console.log("Index: User is authenticated, redirecting to dashboard");
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  // Show loading state while checking authentication
  if (loading) {
    console.log("Index: Showing loading state");
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melody-secondary"></div>
        <div className="ml-3">Loading...</div>
      </div>
    );
  }

  // If user exists but we haven't redirected yet, show redirecting message
  if (user) {
    console.log("Index: User exists, redirecting...");
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melody-secondary"></div>
        <div className="ml-3">Redirecting to dashboard...</div>
      </div>
    );
  }

  // Show landing page for non-authenticated users
  console.log("Index: Showing landing page for non-authenticated user");
  return (
    <div className="min-h-screen bg-gradient-to-br from-melody-primary via-background to-melody-secondary/20">
      <div className="container mx-auto px-4 py-16">
        <header className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <Music className="h-16 w-16 text-melody-secondary mr-4" />
            <h1 className="text-6xl font-bold bg-gradient-to-r from-melody-secondary to-melody-accent bg-clip-text text-transparent">
              Afroverse
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Create amazing songs and instrumentals with the power of AI. Generate music in various genres with just a few clicks.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="text-center p-6 rounded-lg bg-card border">
            <Sparkles className="h-12 w-12 text-melody-secondary mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">AI Music Generation</h3>
            <p className="text-muted-foreground">
              Generate unique songs and instrumentals using advanced AI technology
            </p>
          </div>
          
          <div className="text-center p-6 rounded-lg bg-card border">
            <Users className="h-12 w-12 text-melody-accent mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Community Contests</h3>
            <p className="text-muted-foreground">
              Participate in music contests and showcase your AI-generated creations
            </p>
          </div>
          
          <div className="text-center p-6 rounded-lg bg-card border">
            <Mic className="h-12 w-12 text-melody-secondary mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Voice Cloning</h3>
            <p className="text-muted-foreground">
              Clone voices and create personalized music with custom vocals
            </p>
          </div>
        </div>

        <div className="text-center">
          <div className="space-x-4">
            <Link to="/register">
              <Button size="lg" className="bg-melody-secondary hover:bg-melody-secondary/90">
                Get Started
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">
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
