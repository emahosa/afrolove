
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Music, Disc, Trophy, Plus, Clock, Star } from "lucide-react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}</h1>
          <p className="text-muted-foreground">Create, share, and discover AI-generated music</p>
        </div>
        <div className="flex items-center gap-2 bg-card p-3 rounded-lg">
          <div className="text-sm text-muted-foreground mr-2">Available Credits:</div>
          <div className="flex items-center gap-1 text-melody-secondary font-bold">
            <Star size={16} className="fill-melody-secondary" />
            <span>{user?.credits}</span>
          </div>
          <Link to="/credits">
            <Button size="sm" variant="outline" className="ml-2">
              Get More
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link to="/create">
          <Card className="music-card h-48 bg-gradient-to-br from-melody-primary to-melody-primary/60">
            <CardContent className="h-full flex flex-col items-center justify-center p-6 text-center">
              <Plus size={40} className="mb-4" />
              <h2 className="text-xl font-bold mb-2">Create New Song</h2>
              <p className="text-sm text-muted-foreground">
                Generate songs or instrumentals with AI
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/library">
          <Card className="music-card h-48">
            <CardContent className="h-full flex flex-col items-center justify-center p-6 text-center">
              <Music size={40} className="mb-4 text-melody-secondary" />
              <h2 className="text-xl font-bold mb-2">My Library</h2>
              <p className="text-sm text-muted-foreground">
                Access your saved songs and creations
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/contest">
          <Card className="music-card h-48">
            <CardContent className="h-full flex flex-col items-center justify-center p-6 text-center">
              <Trophy size={40} className="mb-4 text-melody-accent" />
              <h2 className="text-xl font-bold mb-2">Contest</h2>
              <p className="text-sm text-muted-foreground">
                Join our music contests and win prizes
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Recent Tracks</h2>
          <Link to="/library">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="music-card">
              <CardContent className="p-0">
                <div className="aspect-square bg-melody-primary/30 flex items-center justify-center">
                  <Disc className="h-12 w-12 text-melody-secondary/70" />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold truncate">Demo Track {i + 1}</h3>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock size={12} />
                      Just now
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-4">Generated with AI</div>
                  <div className="audio-wave">
                    <div className="audio-wave-bar h-5 animate-wave1"></div>
                    <div className="audio-wave-bar h-8 animate-wave2"></div>
                    <div className="audio-wave-bar h-4 animate-wave3"></div>
                    <div className="audio-wave-bar h-6 animate-wave4"></div>
                    <div className="audio-wave-bar h-3 animate-wave1"></div>
                    <div className="audio-wave-bar h-7 animate-wave2"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
