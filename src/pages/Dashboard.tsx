import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Music, Zap, Trophy, Users, TrendingUp, Crown, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSongs } from "@/hooks/use-songs";
import { useContests } from "@/hooks/use-contests";
import { useGenres } from "@/hooks/use-genres";
import { useGenreTemplates } from "@/hooks/use-genre-templates";
import { toast } from "sonner";
import { Navigate, useNavigate } from "react-router-dom";
import SongCard from "@/components/SongCard";
import ContestCard from "@/components/ContestCard";
import GenreCard from "@/components/GenreCard";
import GenreTemplateCard from "@/components/dashboard/GenreTemplateCard";
import { useSunoGeneration } from "@/hooks/use-suno-generation";
import StatsCard from "@/components/dashboard/StatsCard";
import RecentActivity from "@/components/dashboard/RecentActivity";
import QuickActions from "@/components/dashboard/QuickActions";
import WelcomeHeader from "@/components/dashboard/WelcomeHeader";
import LockScreen from "@/components/LockScreen";

interface Song {
  id: string;
  title: string;
  artist: string;
  genre: string;
  audio_url: string;
  cover_image_url: string;
  created_at: string;
  updated_at: string;
}

interface Contest {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'upcoming';
  prize: string;
  created_at: string;
  updated_at: string;
}

interface Genre {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface GenreTemplate {
  id: string;
  template_name: string;
  admin_prompt: string;
  user_prompt_guide?: string;
  genre_id: string;
  audio_url?: string;
  cover_image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const Dashboard = () => {
  const { user, isSubscriber } = useAuth();
  const { songs, loading: songsLoading } = useSongs();
  const { contests, loading: contestsLoading } = useContests();
  const { genres, loading: genresLoading } = useGenres();
  const { templates, loading: templatesLoading } = useGenreTemplates();
  const [playingTemplates, setPlayingTemplates] = useState<Set<string>>(new Set());
  const { generateSong, isGenerating } = useSunoGeneration();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    // Additional dashboard setup or data fetching can be done here
  }, [user]);

  const handleTemplatePlay = (templateId: string) => {
    setPlayingTemplates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(templateId)) {
        newSet.delete(templateId);
      } else {
        newSet.add(templateId);
      }
      return newSet;
    });
  };

  if (!user) {
    return <Navigate to="/auth" />;
  }

  if (!isSubscriber()) {
    return <LockScreen message="Subscribe to access your dashboard and start creating amazing music!" buttonText="Subscribe Now" />;
  }

  const recentSongs = songs.slice(0, 3);
  const activeContests = contests.filter(contest => contest.status === 'active').slice(0, 2);

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <WelcomeHeader />
      
      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="create">Create</TabsTrigger>
          <TabsTrigger value="library">My Songs</TabsTrigger>
          <TabsTrigger value="contests">Contests</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="affiliate">Affiliate</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Songs"
              value={songs.length}
              icon={<Music className="h-4 w-4" />}
              description="Songs created"
            />
            <StatsCard
              title="Credits"
              value={user.credits || 0}
              icon={<Zap className="h-4 w-4" />}
              description="Available credits"
              variant="primary"
            />
            <StatsCard
              title="Active Contests"
              value={activeContests.length}
              icon={<Trophy className="h-4 w-4" />}
              description="Ongoing contests"
            />
            <StatsCard
              title="Genres"
              value={genres.length}
              icon={<Users className="h-4 w-4" />}
              description="Available styles"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <RecentActivity songs={recentSongs} />
            <QuickActions />
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Songs</CardTitle>
                <CardDescription>Check out the latest songs created by our users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {songsLoading ? (
                  <div className="flex justify-center items-center p-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                    <span className="ml-2">Loading songs...</span>
                  </div>
                ) : recentSongs.length > 0 ? (
                  recentSongs.map(song => (
                    <SongCard key={song.id} song={song} />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Music className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                    <h3 className="text-lg font-semibold mb-1">No Songs Yet</h3>
                    <p className="text-muted-foreground">Songs will appear here when they're created.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Contests</CardTitle>
                <CardDescription>Participate in ongoing contests and win prizes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {contestsLoading ? (
                  <div className="flex justify-center items-center p-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                    <span className="ml-2">Loading contests...</span>
                  </div>
                ) : activeContests.length > 0 ? (
                  activeContests.map(contest => (
                    <ContestCard key={contest.id} contest={contest} />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Trophy className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                    <h3 className="text-lg font-semibold mb-1">No Active Contests</h3>
                    <p className="text-muted-foreground">Check back later for new contests.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="library" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {songsLoading ? (
              <div className="col-span-full flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                <span className="ml-2">Loading your songs...</span>
              </div>
            ) : songs.length > 0 ? (
              songs.map(song => (
                <SongCard key={song.id} song={song} />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Music className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                <h3 className="text-xl font-semibold mb-2">No Songs in Your Library</h3>
                <p className="text-muted-foreground">Create your first song to start building your library!</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="contests" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {contestsLoading ? (
              <div className="col-span-full flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                <span className="ml-2">Loading contests...</span>
              </div>
            ) : contests.length > 0 ? (
              contests.map(contest => (
                <ContestCard key={contest.id} contest={contest} />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                <h3 className="text-xl font-semibold mb-2">No Contests Available</h3>
                <p className="text-muted-foreground">Check back later for new contests.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {genresLoading || templatesLoading ? (
              <div className="col-span-full flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                <span className="ml-2">Loading templates...</span>
              </div>
            ) : genres.length > 0 && templates.length > 0 ? (
              templates.map(template => (
                <GenreTemplateCard
                  key={template.id}
                  template={template}
                  isPlaying={playingTemplates.has(template.id)}
                  onTogglePlay={handleTemplatePlay}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Music className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                <h3 className="text-xl font-semibold mb-2">No Templates Available</h3>
                <p className="text-muted-foreground">Check back later for new templates.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="affiliate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Affiliate Program
              </CardTitle>
              <CardDescription>
                Earn money by referring new users to our platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Crown className="h-16 w-16 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Join Our Affiliate Program</h3>
                <p className="text-muted-foreground mb-6">
                  Earn commissions by referring new subscribers to our platform. 
                  Get paid for every successful referral!
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    onClick={() => navigate('/become-affiliate')}
                    className="flex items-center gap-2"
                  >
                    <Star className="h-4 w-4" />
                    Apply to Become an Affiliate
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => navigate('/affiliate')}
                  >
                    View Affiliate Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
