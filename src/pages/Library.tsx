
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Music, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import GeneratedSongCard from "@/components/music-generation/GeneratedSongCard";
import VoterLockScreen from "@/components/VoterLockScreen";

export interface Song {
  id: string;
  title: string;
  audio_url: string;
  status: 'pending' | 'completed' | 'rejected' | 'approved';
  created_at: string;
  prompt?: string;
  credits_used: number;
  duration?: number;
}

const Library = () => {
  const { user, isVoter, isSubscriber, isAdmin, isSuperAdmin, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);

  const isOnlyVoter = isVoter() && !isSubscriber() && !isAdmin() && !isSuperAdmin();
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (isOnlyVoter) {
    return <VoterLockScreen feature="your music library" />;
  }
  
  const fetchSongs = async (showRefreshingIndicator = false) => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    
    try {
      if (showRefreshingIndicator) setIsRefreshing(true);
      else setIsLoading(true);
      
      console.log('🔍 Library: Fetching songs for user:', user.id);
      
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['completed', 'approved'])
        .order('created_at', { ascending: false });
      
      console.log('📊 Library: Raw songs data from database:', data);
      console.log('❌ Library: Database error (if any):', error);
        
      if (error) {
        console.error('❌ Library: Error fetching songs:', error);
        toast.error('Failed to load songs: ' + error.message);
        return;
      }
      
      console.log('✅ Library: Songs fetched successfully:', data?.length || 0, 'songs');
      
      data?.forEach((song, index) => {
        console.log(`🎵 Library: Song ${index + 1}:`, {
          id: song.id,
          title: song.title,
          status: song.status,
          audio_url: song.audio_url,
          url_length: song.audio_url?.length,
          created_at: song.created_at,
          credits_used: song.credits_used,
          duration: song.duration
        });
      });
      
      setSongs(data || []);
    } catch (error) {
      console.error('💥 Library: Error in fetchSongs:', error);
      toast.error('Failed to load songs');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (user && !isOnlyVoter) {
      console.log('👤 Library: User found, fetching songs');
      fetchSongs();
    } else {
      console.log('👤 Library: No user or only voter');
      setIsLoading(false);
    }
  }, [user, isOnlyVoter]);

  // Realtime subscription for song updates
  useEffect(() => {
    if (!user?.id || isOnlyVoter) return;

    console.log('🔄 Library: Setting up realtime subscription for user:', user.id);

    const channel = supabase
      .channel('songs-library-page-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'songs', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.log('🔄 Library: Realtime update received!', payload);
          
          if (payload.eventType === 'INSERT') {
            const newSong = payload.new as Song;
            console.log('➕ Library: New song added via realtime:', newSong);
            if (newSong.status === 'completed' || newSong.status === 'approved') {
              setSongs(currentSongs => [newSong, ...currentSongs]);
              if (newSong.status === 'completed') {
                toast.success(`🎵 "${newSong.title}" is ready!`);
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedSong = payload.new as Song;
            console.log('🔄 Library: Song updated via realtime:', updatedSong);
            
            if (updatedSong.status === 'completed' || updatedSong.status === 'approved') {
              setSongs(currentSongs => {
                const exists = currentSongs.find(song => song.id === updatedSong.id);
                if (exists) {
                  return currentSongs.map(song => 
                    song.id === updatedSong.id ? updatedSong : song
                  );
                } else {
                  return [updatedSong, ...currentSongs];
                }
              });
              
              if (updatedSong.status === 'completed') {
                toast.success(`🎵 "${updatedSong.title}" is ready!`);
              }
            } else if (updatedSong.status === 'rejected') {
              setSongs(currentSongs => 
                currentSongs.filter(song => song.id !== updatedSong.id)
              );
              toast.error(`❌ "${updatedSong.title}" failed to generate.`);
            }
          } else if (payload.eventType === 'DELETE') {
            console.log('🗑️ Library: Song deleted via realtime:', payload.old);
            setSongs(currentSongs => 
              currentSongs.filter(song => song.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Library: Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user, isOnlyVoter]);
  
  const handleRefresh = () => {
    console.log('🔄 Library: Manual refresh triggered');
    fetchSongs(true);
  };
  
  if (isLoading) {
    console.log('⏳ Library: Loading state');
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading your library...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('👤 Library: No user, showing login message');
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <Music className="h-16 w-16 text-muted-foreground" />
            <h2 className="text-2xl font-semibold">Your Music Library</h2>
            <p className="text-muted-foreground">Please log in to view your songs.</p>
          </div>
        </div>
      </div>
    );
  }

  const completedSongs = songs;

  console.log('📊 Library: Song counts:', {
    total: songs.length,
    completed: completedSongs.length
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8 pb-24">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Music className="h-10 w-10 text-primary" />
              My Library
            </h1>
            <p className="text-muted-foreground text-lg mt-2">All your completed songs</p>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="lg" disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {completedSongs.length > 0 ? (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {completedSongs.map((song) => (
                <GeneratedSongCard key={song.id} song={song} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-20 border-2 border-dashed rounded-xl bg-card/50">
            <Music className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
            <h3 className="text-2xl font-semibold mb-2">No songs yet</h3>
            <p className="text-muted-foreground text-lg mb-6">Create your first song to see it here.</p>
            <Button size="lg" onClick={() => window.location.href = '/create'}>
              Start Creating
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;
