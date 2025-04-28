import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Disc, Search, MoreHorizontal, Music, Download, Share2, Play, Pause, ArrowLeft } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import SplitAudioControl from "@/components/SplitAudioControl";
import VoiceCloning from "@/components/VoiceCloning";
import VoiceChanger from "@/components/VoiceChanger";
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

  const handleDownload = (trackTitle: string) => {
    toast({
      title: "Download started",
      description: "Your song is being downloaded",
    });
    
    setTimeout(() => {
      toast({
        title: "Download complete",
        description: `${trackTitle}.mp3 has been saved to your downloads folder`,
      });
    }, 2000);
  };

  const handleTrackSelect = (trackId: string) => {
    setSelectedTrack(trackId);
  };

  const handleBackToList = () => {
    setSelectedTrack(null);
  };

  const renderSingleTrack = (track: typeof mockTracks[0]) => {
    return (
      <div className="max-w-3xl mx-auto">
        <Button 
          variant="ghost" 
          className="mb-4" 
          onClick={handleBackToList}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Library
        </Button>
        
        <Card key={track.id} className="w-full">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 bg-melody-primary/30 flex items-center justify-center rounded-md">
                  {track.type === "song" ? (
                    <Music className="h-8 w-8 text-melody-secondary/70" />
                  ) : (
                    <Disc className="h-8 w-8 text-melody-secondary/70" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{track.title}</h2>
                  <p className="text-muted-foreground">{track.genre} • {track.type}</p>
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => handlePlay(track.id, track.title)}
                  >
                    {playingTrack === track.id ? (
                      <>
                        <Pause className="mr-2 h-4 w-4" />
                        <span>Stop</span>
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        <span>Play</span>
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload(track.title)}>
                    <Download className="mr-2 h-4 w-4" />
                    <span>Download</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Share2 className="mr-2 h-4 w-4" />
                    <span>Share</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="audio-wave h-24 mb-6">
              <div className="audio-wave-bar h-16"></div>
              <div className="audio-wave-bar h-24"></div>
              <div className="audio-wave-bar h-12"></div>
              <div className="audio-wave-bar h-20"></div>
              <div className="audio-wave-bar h-8"></div>
              <div className="audio-wave-bar h-22"></div>
            </div>

            <div className="space-y-4">
              <SplitAudioControl songName={track.title} songUrl="mock-url" />
              <div className="flex items-center gap-2">
                <VoiceCloning 
                  onVoiceCloned={(voiceId) => setSelectedVoiceId(voiceId)} 
                />
                {selectedVoiceId && (
                  <VoiceChanger 
                    songName={track.title} 
                    songUrl="mock-url"
                    voiceId={selectedVoiceId}
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderTracksList = (tracks: typeof mockTracks) => {
    if (tracks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Disc className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No tracks found</h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery ? "Try a different search term" : "Create your first track to get started"}
          </p>
        </div>
      );
    }

    return tracks.map((track) => (
      <Card 
        key={track.id} 
        className="cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => handleTrackSelect(track.id)}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-melody-primary/30 flex items-center justify-center rounded-md">
              {track.type === "song" ? (
                <Music className="h-6 w-6 text-melody-secondary/70" />
              ) : (
                <Disc className="h-6 w-6 text-melody-secondary/70" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold truncate">{track.title}</h3>
              <p className="text-sm text-muted-foreground">{track.genre} • {track.type}</p>
            </div>
            <span className="text-sm text-muted-foreground">{track.date}</span>
          </div>
        </CardContent>
      </Card>
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Library</h1>
          <p className="text-muted-foreground">All your saved songs and instrumentals</p>
        </div>
      </div>

      {!selectedTrack ? (
        <>
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search your library..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 w-full md:w-auto">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="songs">Songs</TabsTrigger>
                <TabsTrigger value="instrumentals">Instrumentals</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-2">
            {renderTracksList(filteredTracks)}
          </div>
        </>
      ) : (
        renderSingleTrack(mockTracks.find(track => track.id === selectedTrack)!)
      )}
    </div>
  );
};

export default Library;
