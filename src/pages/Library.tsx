
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Disc, Search, MoreHorizontal, Music, Download, Share2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Mock data
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

  // Filter tracks based on search query and active tab
  const filteredTracks = mockTracks.filter((track) => {
    const matchesSearch = track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          track.genre.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "songs") return matchesSearch && track.type === "song";
    if (activeTab === "instrumentals") return matchesSearch && track.type === "instrumental";
    
    return matchesSearch;
  });

  const renderTracksList = (tracks: typeof mockTracks) => {
    if (tracks.length === 0) {
      return (
        <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
          <Disc className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No tracks found</h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery ? "Try a different search term" : "Create your first track to get started"}
          </p>
        </div>
      );
    }

    return tracks.map((track) => (
      <Card key={track.id} className="music-card">
        <CardContent className="p-0">
          <div className="aspect-square bg-melody-primary/30 flex items-center justify-center">
            {track.type === "song" ? (
              <Music className="h-12 w-12 text-melody-secondary/70" />
            ) : (
              <Disc className="h-12 w-12 text-melody-secondary/70" />
            )}
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold truncate">{track.title}</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="flex items-center">
                    <Music className="mr-2 h-4 w-4" />
                    <span>Play</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center">
                    <Download className="mr-2 h-4 w-4" />
                    <span>Download</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center">
                    <Share2 className="mr-2 h-4 w-4" />
                    <span>Share</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{track.genre} • {track.type}</span>
              <span>{track.date}</span>
            </div>

            <div className="mt-4 audio-wave">
              <div className="audio-wave-bar h-5"></div>
              <div className="audio-wave-bar h-8"></div>
              <div className="audio-wave-bar h-4"></div>
              <div className="audio-wave-bar h-6"></div>
              <div className="audio-wave-bar h-3"></div>
              <div className="audio-wave-bar h-7"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    ));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-2">My Library</h1>
      <p className="text-muted-foreground">All your saved songs and instrumentals</p>

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
        
          <TabsContent value="all" className="mt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {renderTracksList(filteredTracks)}
            </div>
          </TabsContent>
          
          <TabsContent value="songs" className="mt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {renderTracksList(filteredTracks.filter(track => track.type === "song"))}
            </div>
          </TabsContent>
          
          <TabsContent value="instrumentals" className="mt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {renderTracksList(filteredTracks.filter(track => track.type === "instrumental"))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Library;
