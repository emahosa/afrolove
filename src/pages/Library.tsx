
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import TracksList from "@/components/library/TracksList";
import SingleTrackView from "@/components/library/SingleTrackView";
import LibraryFilters from "@/components/library/LibraryFilters";
import { toast } from "@/hooks/use-toast";
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
      if (!user?.id) return;
      
      try {
        setIsLoading(true);
        
        const { data: songsData, error: songsError } = await supabase
          .from('songs')
          .select(`
            id,
            title,
            type,
            created_at,
            audio_url,
            genre_id,
            genres (name)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (songsError) throw songsError;
        
        const formattedTracks = (songsData || []).map(song => ({
          id: song.id,
          title: song.title,
          type: song.type as "song" | "instrumental",
          genre: song.genres?.name || "Unknown",
          date: formatDate(song.created_at),
          audio_url: song.audio_url,
          genre_id: song.genre_id
        }));
        
        setTracks(formattedTracks);
      } catch (error) {
        console.error("Error fetching tracks:", error);
        toast({
          title: "Failed to load tracks",
          description: "We couldn't load your library. Please try again later.",
          variant: "destructive",
        });
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
      toast({
        title: "Playback stopped",
        description: "Song preview stopped",
      });
    } else {
      setPlayingTrack(trackId);
      toast({
        title: "Playing preview",
        description: `Now playing: ${trackTitle}`,
      });
      
      setTimeout(() => {
        setPlayingTrack(null);
        toast({
          title: "Playback complete",
          description: "The song preview has ended",
        });
      }, 30000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">My Library</h1>
        <p className="text-muted-foreground">All your saved songs and instrumentals</p>
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
