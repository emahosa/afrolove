
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Music, Disc, Trophy, Plus, Clock, Star, Play, Pause, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { toast } from "sonner";

interface Song {
  id: string;
  title: string;
  status: 'pending' | 'completed' | 'rejected' | 'approved';
  created_at: string;
  audio_url?: string;
  type: 'song' | 'instrumental';
}

const Dashboard = () => {
  const { user } = useAuth();
  const { handlePlay } = useAudioPlayer();
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecentSongs = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('songs')
        .select('id, title, status, created_at, audio_url, type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) {
        console.error('Error fetching songs:', error);
        return;
      }

      setRecentSongs(data || []);
    } catch (error) {
      console.error('Error fetching recent songs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentSongs();
    
    // Set up real-time updates for songs
    const channel = supabase
      .channel('songs-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'songs',
          filter: `user_id=eq.${user?.id}`
        },
        () => {
          console.log('Song updated, refreshing list');
          fetchRecentSongs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handlePlaySong = (song: Song) => {
    if (song.status === 'completed' && song.audio_url && song.audio_url.startsWith('http')) {
      handlePlay({
        id: song.id,
        title: song.title
      });
    } else {
      toast.error('Song is not ready for playback yet');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'rejected':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Ready';
      case 'pending':
        return 'Generating...';
      case 'rejected':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

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

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="music-card animate-pulse">
                <CardContent className="p-0">
                  <div className="aspect-square bg-gray-200"></div>
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : recentSongs.length === 0 ? (
          <Card className="music-card">
            <CardContent className="p-12 text-center">
              <Music className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No songs yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first AI-generated song to get started!
              </p>
              <Link to="/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Song
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentSongs.map((song) => (
              <Card key={song.id} className="music-card">
                <CardContent className="p-0">
                  <div className="aspect-square bg-gradient-to-br from-melody-primary/30 to-melody-secondary/30 flex items-center justify-center relative group">
                    <Disc className="h-12 w-12 text-melody-secondary/70" />
                    
                    {song.status === 'completed' && song.audio_url?.startsWith('http') && (
                      <Button
                        variant="secondary"
                        size="lg"
                        className="absolute inset-0 m-auto h-14 w-14 rounded-full bg-white/90 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.preventDefault();
                          handlePlaySong(song);
                        }}
                      >
                        <Play className="h-6 w-6 ml-1" />
                      </Button>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold truncate">{song.title}</h3>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock size={12} />
                        {formatTimeAgo(song.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        {song.type === 'instrumental' ? 'Instrumental' : 'Song'} • AI Generated
                      </div>
                      <span className={`text-xs font-medium ${getStatusColor(song.status)}`}>
                        {getStatusText(song.status)}
                      </span>
                    </div>
                    {song.status === 'pending' && (
                      <div className="audio-wave mt-2">
                        <div className="audio-wave-bar h-3 animate-wave1"></div>
                        <div className="audio-wave-bar h-5 animate-wave2"></div>
                        <div className="audio-wave-bar h-2 animate-wave3"></div>
                        <div className="audio-wave-bar h-4 animate-wave4"></div>
                        <div className="audio-wave-bar h-2 animate-wave1"></div>
                        <div className="audio-wave-bar h-5 animate-wave2"></div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
