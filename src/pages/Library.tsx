
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import TracksList from "@/components/library/TracksList";
import SingleTrackView from "@/components/library/SingleTrackView";
import LibraryFilters from "@/components/library/LibraryFilters";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Track {
  id: string;
  title: string;
  type: "song" | "instrumental";
  genre: string;
  date: string;
  audio_url?: string;
  genre_id?: string;
  status?: string;
}

const Library = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [pendingSongs, setPendingSongs] = useState<Track[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);

  const fetchTracks = async (showRefreshingIndicator = false) => {
    if (!user?.id) {
      console.log('Library: No user ID available, skipping fetch');
      setIsLoading(false);
      return;
    }
    
    try {
      if (showRefreshingIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      
      console.log('Library: Fetching tracks for user:', user.id);
      
      // Fetch user-specific songs with better error handling
      const { data: songsData, error: songsError } = await supabase
        .from('songs')
        .select(`
          id,
          title,
          type,
          created_at,
          audio_url,
          genre_id,
          status,
          user_id,
          genres (name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (songsError) {
        console.error('Library: Error fetching user songs:', songsError);
        toast.error('Failed to load songs: ' + songsError.message);
        return;
      }
      
      console.log('Library: Raw songs data:', songsData);
      
      if (!songsData || songsData.length === 0) {
        console.log('Library: No songs found for user');
        setTracks([]);
        setPendingSongs([]);
        toast.info("No songs found. Create your first song to get started!");
        return;
      }
      
      // Separate completed and pending songs with detailed logging
      const completedSongs = songsData.filter(song => {
        const isCompleted = song.audio_url && 
                           !song.audio_url.startsWith('task_pending:') &&
                           song.status === 'approved';
        console.log(`Song ${song.id}: status=${song.status}, audio_url=${song.audio_url}, isCompleted=${isCompleted}`);
        return isCompleted;
      });
      
      const pendingSongsList = songsData.filter(song => {
        const isPending = song.status === 'pending' || 
                         (song.audio_url && song.audio_url.startsWith('task_pending:'));
        console.log(`Song ${song.id}: status=${song.status}, audio_url=${song.audio_url}, isPending=${isPending}`);
        return isPending;
      });
      
      console.log(`Library: Found ${completedSongs.length} completed songs and ${pendingSongsList.length} pending songs`);
      
      const formattedTracks = completedSongs.map(song => ({
        id: song.id,
        title: song.title,
        type: song.type as "song" | "instrumental",
        genre: song.genres?.name || "Unknown",
        date: formatDate(song.created_at),
        audio_url: song.audio_url,
        genre_id: song.genre_id,
        status: song.status
      }));

      const formattedPendingSongs = pendingSongsList.map(song => ({
        id: song.id,
        title: song.title || 'Generating...',
        type: song.type as "song" | "instrumental",
        genre: song.genres?.name || "Unknown",
        date: formatDate(song.created_at),
        audio_url: song.audio_url,
        genre_id: song.genre_id,
        status: song.status
      }));
      
      setTracks(formattedTracks);
      setPendingSongs(formattedPendingSongs);
      
      if (formattedTracks.length === 0 && formattedPendingSongs.length === 0) {
        toast.info("No songs found in your library. Generate some songs to see them here!");
      } else if (formattedPendingSongs.length > 0) {
        toast.info(`You have ${formattedPendingSongs.length} song(s) still generating. They will appear once ready.`);
      } else {
        console.log(`Library: Successfully loaded ${formattedTracks.length} completed tracks`);
      }
    } catch (error) {
      console.error("Library: Error fetching tracks:", error);
      toast.error("Failed to load tracks. Please try again later.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, [user]);

  // Set up realtime subscription for song updates
  useEffect(() => {
    if (!user?.id) return;

    console.log('Library: Setting up realtime subscription for user:', user.id);

    const channel = supabase
      .channel('songs-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'songs',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Library: Song updated via realtime:', payload);
          
          if (payload.new.status === 'approved' && 
              payload.new.audio_url && 
              !payload.new.audio_url.startsWith('task_pending:')) {
            console.log('Library: Detected approved song, refreshing...');
            fetchTracks(true);
            toast.success(`🎵 "${payload.new.title}" is now ready in your library!`);
          }
        }
      )
      .subscribe((status) => {
        console.log('Library: Realtime subscription status:', status);
      });

    return () => {
      console.log('Library: Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user]);
  
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)}w ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const filteredTracks = tracks.filter((track) => {
    const matchesSearch = track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          track.genre.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "songs") return matchesSearch && track.type === "song";
    if (activeTab === "instrumentals") return matchesSearch && track.type === "instrumental";
    
    return matchesSearch;
  });

  const handlePlay = (trackId: string, trackTitle: string) => {
    if (playingTrack === trackId) {
      setPlayingTrack(null);
      toast.success("Playback stopped");
    } else {
      setPlayingTrack(trackId);
      toast.success(`Now playing: ${trackTitle}`);
      
      setTimeout(() => {
        setPlayingTrack(null);
        toast.success("Playback complete");
      }, 30000);
    }
  };

  const handleRefresh = () => {
    console.log('Library: Manual refresh triggered');
    fetchTracks(true);
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
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Library</h1>
          <p className="text-muted-foreground">Please log in to view your songs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Library</h1>
            <p className="text-muted-foreground">All your saved songs and instrumentals</p>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Show pending songs section */}
      {pendingSongs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Generating Songs</h2>
            <Badge variant="secondary">{pendingSongs.length}</Badge>
          </div>
          <div className="grid gap-4">
            {pendingSongs.map((song) => (
              <div key={song.id} className="p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{song.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {song.genre} • {song.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <Badge variant="outline">Generating</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!selectedTrack ? (
        <>
          <LibraryFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          <TracksList
            tracks={filteredTracks}
            onTrackSelect={(trackId) => setSelectedTrack(trackId)}
          />
        </>
      ) : (
        <SingleTrackView
          track={tracks.find(track => track.id === selectedTrack)!}
          onBackClick={() => setSelectedTrack(null)}
          playingTrack={playingTrack}
          onPlayToggle={handlePlay}
          onVoiceCloned={(voiceId) => setSelectedVoiceId(voiceId)}
          selectedVoiceId={selectedVoiceId}
        />
      )}
    </div>
  );
};

export default Library;
