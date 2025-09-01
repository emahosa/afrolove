
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Music, Trophy, Users, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import HeroSection from '@/components/HeroSection';
import ContestWinners from '@/components/ContestWinners';

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Hero Section */}
        <HeroSection />

        {/* Contest Winners Banner */}
        <ContestWinners />

        {/* Welcome Section */}
        <section className="text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Welcome to MusicApp
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Create, compete, and earn with AI-powered music generation. Join contests, win prizes, and showcase your musical creativity.
          </p>
          
          {!user && (
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/auth">
                <Button size="lg" className="px-8 py-3">
                  Get Started
                </Button>
              </Link>
              <Link to="/contests">
                <Button variant="outline" size="lg" className="px-8 py-3">
                  View Contests
                </Button>
              </Link>
            </div>
          )}
        </section>

        {/* Features Grid */}
        <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Music className="h-12 w-12 mx-auto text-primary" />
              <CardTitle>AI Music Creation</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Generate unique songs with our advanced AI technology
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Trophy className="h-12 w-12 mx-auto text-primary" />
              <CardTitle>Win Contests</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Participate in music contests and win amazing prizes
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Users className="h-12 w-12 mx-auto text-primary" />
              <CardTitle>Community</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Connect with musicians and music lovers worldwide
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Zap className="h-12 w-12 mx-auto text-primary" />
              <CardTitle>Fast & Easy</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Create professional-quality music in minutes
              </CardDescription>
            </CardContent>
          </Card>
        </section>

        {/* Call to Action */}
        {user && (
          <section className="text-center space-y-6 py-12">
            <h2 className="text-3xl font-bold">Ready to Create?</h2>
            <p className="text-xl text-muted-foreground">
              Start your musical journey today
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/create">
                <Button size="lg" className="px-8 py-3">
                  Create Music
                </Button>
              </Link>
              <Link to="/contests">
                <Button variant="outline" size="lg" className="px-8 py-3">
                  Join Contests
                </Button>
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Index;
