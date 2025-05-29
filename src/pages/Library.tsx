
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import TracksList from "@/components/library/TracksList";
import SingleTrackView from "@/components/library/SingleTrackView";
import LibraryFilters from "@/components/library/LibraryFilters";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

// Track interface for consistency
interface Track {
  id: string;
  title: string;
  type: "song" | "instrumental";
  genre: string;
  date: string;
  // Additional properties from the database
  audio_url?: string;
  genre_id?: string;
  status?: string;
}

const Library = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);

  useEffect(() => {
    const fetchTracks = async () => {
      if (!user?.id) {
        console.log('Library: No user ID available, skipping fetch');
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        console.log('Library: Fetching tracks for user:', user.id);
        
        // First, let's check all songs regardless of user_id to debug
        const { data: allSongs, error: allSongsError } = await supabase
          .from('songs')
          .select(`
            id,
            title,
            type,
            created_at,
            audio_url,
            genre_id,
            user_id,
            status,
            genres (name)
          `)
          .order('created_at', { ascending: false });
          
        if (allSongsError) {
          console.error('Library: Error fetching all songs:', allSongsError);
        } else {
          console.log('Library: All songs in database:', allSongs);
          const userSongs = allSongs?.filter(song => song.user_id === user.id) || [];
          console.log('Library: Songs for current user:', userSongs);
        }
        
        // Now fetch user-specific songs
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
            genres (name)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (songsError) {
          console.error('Library: Error fetching user songs:', songsError);
          throw songsError;
        }
        
        console.log('Library: User songs data:', songsData);
        
        const formattedTracks = (songsData || []).map(song => ({
          id: song.id,
          title: song.title,
          type: song.type as "song" | "instrumental",
          genre: song.genres?.name || "Unknown",
          date: formatDate(song.created_at),
          audio_url: song.audio_url,
          genre_id: song.genre_id,
          status: song.status
        }));
        
        console.log('Library: Formatted tracks:', formattedTracks);
        setTracks(formattedTracks);
        
        if (formattedTracks.length === 0) {
          toast.info("No songs found in your library. Generated songs should appear here automatically.");
        } else {
          console.log(`Library: Found ${formattedTracks.length} tracks`);
        }
      } catch (error) {
        console.error("Library: Error fetching tracks:", error);
        toast.error("Failed to load tracks. We couldn't load your library. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTracks();
  }, [user]);
  
  // Helper function to format dates
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
      toast.success("Playback stopped. Song preview stopped");
    } else {
      setPlayingTrack(trackId);
      toast.success(`Playing preview. Now playing: ${trackTitle}`);
      
      setTimeout(() => {
        setPlayingTrack(null);
        toast.success("Playback complete. The song preview has ended");
      }, 30000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading your library...</span>
      </div>
    );
  }

  // Show debug info if no user
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
        <h1 className="text-3xl font-bold mb-2">My Library</h1>
        <p className="text-muted-foreground">All your saved songs and instrumentals</p>
        {user && (
          <p className="text-xs text-muted-foreground mt-1">User ID: {user.id}</p>
        )}
      </div>

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
