
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Music, RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import GeneratedSongCard from "@/components/music-generation/GeneratedSongCard";
import AudioPlayer from "@/components/AudioPlayer";

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
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  
  const fetchSongs = async (showRefreshingIndicator = false) => {
    if (!user?.id) return;
    
    if (showRefreshingIndicator) setIsRefreshing(true);
    else setIsLoading(true);
      
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
        
    if (error) {
      toast.error('Failed to load songs: ' + error.message);
    } else if (data) {
      setSongs(data as Song[]);
    }
    
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (user) fetchSongs();
  }, [user]);

  // Realtime subscription for song updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('songs-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'songs', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.log('Library: Realtime update received!', payload);
          const updatedSong = payload.new as Song;
          
          // Optimistically update the local state
          setSongs(currentSongs =>
            currentSongs.map(song => (song.id === updatedSong.id ? updatedSong : song))
          );

          if (updatedSong.status === 'completed') {
            toast.success(`🎵 "${updatedSong.title}" is ready!`);
          } else if (updatedSong.status === 'rejected') {
            toast.error(`❌ "${updatedSong.title}" failed to generate.`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
  
  const handleRefresh = () => {
    fetchSongs(true);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading your library...</span>
      </div>
    );
  }

  if (!user) {
    return <p className="text-muted-foreground">Please log in to view your songs.</p>
  }

  const pendingSongs = songs.filter(s => s.status === 'pending');
  const completedSongs = songs.filter(s => s.status === 'completed' || s.status === 'approved');
  const failedSongs = songs.filter(s => s.status === 'rejected');

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

      <AudioPlayer />
    </div>
  );
};

export default Library;
