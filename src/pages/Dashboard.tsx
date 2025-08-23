
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music, Sparkles, Trophy, Users, Zap, Headphones, Mic, Play, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useGenres } from "@/hooks/use-genres";
import { GenreTemplateCard } from "@/components/dashboard/GenreTemplateCard";
import { SampleMusic } from "@/components/dashboard/SampleMusic";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { user, isVoter, isSubscriber, isAdmin, isSuperAdmin } = useAuth();
  const { genres, loading: genresLoading } = useGenres();
  const [userStats, setUserStats] = useState({
    songsCreated: 0,
    creditsUsed: 0,
    contestsJoined: 0,
    totalVotes: 0
  });
  const [recentSongs, setRecentSongs] = useState<any[]>([]);

  const isOnlyVoter = isVoter() && !isSubscriber() && !isAdmin() && !isSuperAdmin();

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) return;

      try {
        // Fetch user songs
        const { data: songs, error: songsError } = await supabase
          .from('songs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!songsError && songs) {
          setRecentSongs(songs);
          setUserStats(prev => ({
            ...prev,
            songsCreated: songs.length,
            creditsUsed: songs.reduce((sum, song) => sum + (song.credits_used || 0), 0)
          }));
        }

        // Fetch contest entries
        const { data: entries, error: entriesError } = await supabase
          .from('contest_entries')
          .select('*')
          .eq('user_id', user.id);

        if (!entriesError && entries) {
          setUserStats(prev => ({
            ...prev,
            contestsJoined: entries.length,
            totalVotes: entries.reduce((sum, entry) => sum + (entry.vote_count || 0), 0)
          }));
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 pb-24">
        {/* Welcome Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Welcome back, {user?.user_metadata?.full_name || 'Creator'}!
              </h1>
              <p className="text-muted-foreground text-lg mt-2">
                Ready to create some amazing music today?
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="px-3 py-1 text-sm">
                {isAdmin() ? 'Admin' : isSubscriber() ? 'Pro' : isVoter() ? 'Voter' : 'Free'}
              </Badge>
              <div className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-lg">
                <Zap className="h-4 w-4 text-primary" />
                <span className="font-medium">{user?.credits || 0} Credits</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-scale-in">
          <Card className="bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Songs Created</CardTitle>
              <Music className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{userStats.songsCreated}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
              <Zap className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{userStats.creditsUsed}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contests Joined</CardTitle>
              <Trophy className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{userStats.contestsJoined}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
              <Star className="h-4 w-4 text-pink-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-pink-500">{userStats.totalVotes}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="create" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-4 bg-card/50 backdrop-blur-sm">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Create
            </TabsTrigger>
            <TabsTrigger value="library" className="flex items-center gap-2">
              <Headphones className="h-4 w-4" />
              Library
            </TabsTrigger>
            <TabsTrigger value="contest" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Contest
            </TabsTrigger>
            <TabsTrigger value="community" className="flex items-center gap-2 hidden lg:flex">
              <Users className="h-4 w-4" />
              Community
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Quick Actions */}
              <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="h-5 w-5 text-primary" />
                    Start Creating
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Link to="/create">
                      <Button className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all duration-300">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Song
                      </Button>
                    </Link>
                    <Link to="/create?mode=instrumental">
                      <Button variant="outline" className="w-full hover:bg-primary/5 transition-all duration-300">
                        <Music className="mr-2 h-4 w-4" />
                        Create Instrumental
                      </Button>
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Link to="/create?mode=lyrics">
                      <Button variant="outline" className="w-full hover:bg-accent/5 transition-all duration-300">
                        <Mic className="mr-2 h-4 w-4" />
                        Write Lyrics
                      </Button>
                    </Link>
                    <Link to="/create?mode=voice">
                      <Button variant="outline" className="w-full hover:bg-secondary/5 transition-all duration-300">
                        <Users className="mr-2 h-4 w-4" />
                        Voice Clone
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Songs */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Headphones className="h-5 w-5 text-accent" />
                    Recent Songs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentSongs.length > 0 ? (
                    <div className="space-y-3">
                      {recentSongs.slice(0, 3).map((song) => (
                        <div key={song.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                              <Music className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium truncate max-w-32">{song.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(song.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost">
                            <Play className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Link to="/library">
                        <Button variant="outline" className="w-full mt-3">
                          View All Songs
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Music className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No songs yet</p>
                      <p className="text-sm text-muted-foreground">Create your first song to see it here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Genre Templates */}
            <Card>
              <CardHeader>
                <CardTitle>Popular Genres</CardTitle>
              </CardHeader>
              <CardContent>
                {genresLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="bg-muted rounded-lg h-32 mb-2"></div>
                        <div className="bg-muted rounded h-4 mb-1"></div>
                        <div className="bg-muted rounded h-3"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {genres.slice(0, 6).map((genre) => (
                      <GenreTemplateCard key={genre.id} genre={genre} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="library">
            <Card>
              <CardHeader>
                <CardTitle>Your Music Library</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Headphones className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Your Library Awaits</h3>
                  <p className="text-muted-foreground mb-6">All your created songs will appear here</p>
                  <Link to="/library">
                    <Button className="bg-gradient-to-r from-primary to-accent">
                      Open Full Library
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contest">
            <Card>
              <CardHeader>
                <CardTitle>Music Contests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Showcase Your Talent</h3>
                  <p className="text-muted-foreground mb-6">Join contests and compete with other creators</p>
                  <Link to="/contest">
                    <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                      View Contests
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="community">
            <Card>
              <CardHeader>
                <CardTitle>Community</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Connect with Creators</h3>
                  <p className="text-muted-foreground mb-6">Discover music from the community</p>
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                    Explore Community
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
