import { useState } from "react";
import TracksList from "@/components/library/TracksList";
import SingleTrackView from "@/components/library/SingleTrackView";
import LibraryFilters from "@/components/library/LibraryFilters";
import { toast } from "@/hooks/use-toast";

const mockTracks = [
  {
    id: "1",
    title: "Summer Vibes",
    type: "song",
    genre: "Afrobeats",
    date: "2h ago",
  },
  {
    id: "2",
    title: "Rainy Mood",
    type: "instrumental",
    genre: "R&B",
    date: "Yesterday",
  },
  {
    id: "3",
    title: "City Lights",
    type: "song",
    genre: "Pop",
    date: "3d ago",
  },
  {
    id: "4",
    title: "Retro Wave",
    type: "instrumental",
    genre: "Pop",
    date: "5d ago",
  },
  {
    id: "5",
    title: "Sunset Dreams",
    type: "song",
    genre: "R&B",
    date: "1w ago",
  },
  {
    id: "6",
    title: "Ocean Breeze",
    type: "instrumental",
    genre: "Highlife",
    date: "2w ago",
  },
];

const Library = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);

  const filteredTracks = mockTracks.filter((track) => {
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
          track={mockTracks.find(track => track.id === selectedTrack)!}
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
