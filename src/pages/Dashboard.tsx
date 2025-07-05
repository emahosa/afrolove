
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Music, Trophy, Users, Star, TrendingUp, Play, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface DashboardStats {
  totalSongs: number;
  totalContests: number;
  totalUsers: number;
  userCredits: number;
  recentSongs: Array<{
    id: string;
    title: string;
    created_at: string;
    audio_url: string | null;
  }>;
  activeContests: Array<{
    id: string;
    title: string;
    end_date: string;
    prize: string;
  }>;
}

const Dashboard = () => {
  const { user, userRoles, isVoter, isSubscriber, isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalSongs: 0,
    totalContests: 0,
    totalUsers: 0,
    userCredits: 0,
    recentSongs: [],
    activeContests: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch user's credits
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      // Fetch user's recent songs
      const { data: recentSongs } = await supabase
        .from('songs')
        .select('id, title, created_at, audio_url')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch active contests
      const { data: activeContests } = await supabase
        .from('contests')
        .select('id, title, end_date, prize')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(3);

      // Fetch total counts (only for admin/moderator view)
      let totalSongs = 0;
      let totalUsers = 0;
      let totalContests = 0;

      if (isAdmin()) {
        const [songsCount, usersCount, contestsCount] = await Promise.all([
          supabase.from('songs').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('contests').select('*', { count: 'exact', head: true })
        ]);

        totalSongs = songsCount.count || 0;
        totalUsers = usersCount.count || 0;
        totalContests = contestsCount.count || 0;
      } else {
        // For regular users, show their own stats
        const { count: userSongsCount } = await supabase
          .from('songs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        totalSongs = userSongsCount || 0;
      }

      setStats({
        totalSongs,
        totalContests,
        totalUsers,
        userCredits: profile?.credits || 0,
        recentSongs: recentSongs || [],
        activeContests: activeContests || []
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const downloadSong = async (song: { id: string; title: string; audio_url: string | null }) => {
    if (!song.audio_url) {
      toast.error('No audio file available for this song');
      return;
    }

    try {
      const response = await fetch(song.audio_url);
      if (!response.ok) throw new Error('Failed to download');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${song.title}.mp3`; // Use actual song title
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`${song.title} downloaded successfully!`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download song');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <span className="ml-3">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}!
        </h1>
        <p className="text-muted-foreground">
          {isAdmin() ? 'Manage your platform from here.' : 
           isSubscriber() ? 'Ready to create amazing music?' : 
           isVoter() ? 'Vote on contests and explore music.' : 
           'Welcome to MelodyVerse!'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isAdmin() ? 'Total Songs' : 'My Songs'}
            </CardTitle>
            <Music className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSongs}</div>
            <p className="text-xs text-muted-foreground">
              {isAdmin() ? 'Platform-wide' : 'Songs created'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Contests</CardTitle>
            <Trophy className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeContests.length}</div>
            <p className="text-xs text-muted-foreground">Available to join</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits</CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.userCredits}</div>
            <p className="text-xs text-muted-foreground">Available credits</p>
          </CardContent>
        </Card>

        {isAdmin() && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">Registered users</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Songs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Recent Songs
            </CardTitle>
            <CardDescription>Your latest creations</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentSongs.length > 0 ? (
              <div className="space-y-3">
                {stats.recentSongs.map((song) => (
                  <div key={song.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{song.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(song.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {song.audio_url && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const audio = new Audio(song.audio_url!);
                              audio.play();
                            }}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadSong(song)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No songs created yet. Start creating your first song!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Active Contests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Active Contests
            </CardTitle>
            <CardDescription>Join and win amazing prizes</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.activeContests.length > 0 ? (
              <div className="space-y-3">
                {stats.activeContests.map((contest) => (
                  <div key={contest.id} className="p-3 border rounded-lg">
                    <h4 className="font-medium">{contest.title}</h4>
                    <p className="text-sm text-muted-foreground">Prize: {contest.prize}</p>
                    <p className="text-sm text-muted-foreground">
                      Ends: {new Date(contest.end_date).toLocaleDateString()}
                    </p>
                  </div>
                ))}
                <Link to="/contest">
                  <Button className="w-full mt-4">
                    View All Contests
                  </Button>
                </Link>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No active contests at the moment.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Role-based Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            {userRoles.length > 0 && (
              <span>Your roles: {userRoles.join(', ')}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/contest">
            <Button className="w-full" variant="outline">
              <Trophy className="mr-2 h-4 w-4" />
              Join Contest
            </Button>
          </Link>
          
          <Link to="/credits">
            <Button className="w-full" variant="outline">
              <Star className="mr-2 h-4 w-4" />
              Buy Credits
            </Button>
          </Link>
          
          <Link to="/profile">
            <Button className="w-full" variant="outline">
              <Users className="mr-2 h-4 w-4" />
              View Profile
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
