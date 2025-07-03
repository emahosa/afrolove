
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Music, RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  // Check if user is only a voter (no subscriber/admin roles)
  const isOnlyVoter = isVoter() && !isSubscriber() && !isAdmin() && !isSuperAdmin();
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
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
        .order('created_at', { ascending: false });
      
      console.log('📊 Library: Raw songs data from database:', data);
      console.log('❌ Library: Database error (if any):', error);
        
      if (error) {
        console.error('❌ Library: Error fetching songs:', error);
        toast.error('Failed to load songs: ' + error.message);
        return;
      }
      
      console.log('✅ Library: Songs fetched successfully:', data?.length || 0, 'songs');
      
      // Enhanced logging for each song
      data?.forEach((song, index) => {
        console.log(`🎵 Library: Song ${index + 1}:`, {
          id: song.id,
          title: song.title,
          status: song.status,
          audio_url: song.audio_url,
          url_length: song.audio_url?.length,
          url_starts_with_http: song.audio_url?.startsWith('http'),
          url_contains_suno: song.audio_url?.includes('suno'),
          url_contains_cdn: song.audio_url?.includes('cdn'),
          created_at: song.created_at,
          prompt: song.prompt?.substring(0, 50) + '...',
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
    if (user) {
      console.log('👤 Library: User found, fetching songs');
      fetchSongs();
    } else {
      console.log('👤 Library: No user found');
      setIsLoading(false);
    }
  }, [user]);

  // Realtime subscription for song updates
  useEffect(() => {
    if (!user?.id) return;

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
            setSongs(currentSongs => [newSong, ...currentSongs]);
            if (newSong.status === 'completed') {
              toast.success(`🎵 "${newSong.title}" is ready!`);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedSong = payload.new as Song;
            console.log('🔄 Library: Song updated via realtime:', updatedSong);
            setSongs(currentSongs =>
              currentSongs.map(song => (song.id === updatedSong.id ? updatedSong : song))
            );

            if (updatedSong.status === 'completed') {
              toast.success(`🎵 "${updatedSong.title}" is ready!`);
            } else if (updatedSong.status === 'rejected') {
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
  }, [user]);
  
  const handleRefresh = () => {
    console.log('🔄 Library: Manual refresh triggered');
    fetchSongs(true);
  };
  
  if (isLoading) {
    console.log('⏳ Library: Loading state');
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading your library...</span>
      </div>
    );
  }

  if (!user) {
    console.log('👤 Library: No user, showing login message');
    return <p className="text-muted-foreground">Please log in to view your songs.</p>
  }

  const pendingSongs = songs.filter(s => s.status === 'pending');
  const completedSongs = songs.filter(s => s.status === 'completed' || s.status === 'approved');
  const failedSongs = songs.filter(s => s.status === 'rejected');

  console.log('📊 Library: Song counts:', {
    total: songs.length,
    pending: pendingSongs.length,
    completed: completedSongs.length,
    failed: failedSongs.length
  });

  return (
    <div className="space-y-8 pb-24"> {/* Padding bottom to avoid overlap with player */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Library</h1>
          <p className="text-muted-foreground">All your generated songs</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {pendingSongs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" /> Generating Songs
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingSongs.map((song) => (
              <GeneratedSongCard key={song.id} song={song} />
            ))}
          </div>
        </div>
      )}
      
      {completedSongs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Completed Songs</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedSongs.map((song) => (
              <GeneratedSongCard key={song.id} song={song} />
            ))}
          </div>
        </div>
      )}

      {songs.length === 0 && !isLoading && (
         <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <Music className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No songs yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Create your first song to see it here.</p>
         </div>
      )}

      {failedSongs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-destructive">Failed Songs</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {failedSongs.map((song) => (
              <GeneratedSongCard key={song.id} song={song} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;
