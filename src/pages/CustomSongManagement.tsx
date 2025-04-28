import { useState, useEffect, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Music,
  Search,
  Upload,
  Check,
  X,
  MessageSquare,
  Edit,
  Plus
} from "lucide-react";

type SongRequest = {
  id: string;
  title: string;
  user: string;
  description: string;
  genre: string;
  status: string;
  created_at: string;
  lyrics?: string;
  audio_url?: string;
};

const CustomSongManagement = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [lyricsDraft, setLyricsDraft] = useState("");
  const [uploadingAudio, setUploadingAudio] = useState(false);

  const [songRequests, setSongRequests] = useState<SongRequest[]>([
    { 
      id: "1", 
      title: "Summer Love Song", 
      user: "john@example.com", 
      description: "An upbeat summer love song with catchy chorus", 
      genre: "Pop", 
      status: "pending",
      created_at: "2023-04-20"
    },
    { 
      id: "2", 
      title: "Rainy Day Blues", 
      user: "sarah@example.com", 
      description: "A melancholic blues song about rainy days in the city", 
      genre: "Blues", 
      status: "lyrics_review",
      created_at: "2023-04-18",
      lyrics: "Rainy days in the city\nWatching people go by\nDrops on my window\nReflecting my state of mind\n\nThese blues won't leave me alone\nAs the sky keeps crying its tears\nThese rainy day blues\nWash away all my fears"
    },
    { 
      id: "3", 
      title: "Electronic Dreams", 
      user: "mike@example.com", 
      description: "A futuristic electronic track with synthesizer and vocal chops", 
      genre: "Electronic", 
      status: "completed",
      created_at: "2023-04-15",
      lyrics: "Digital dreams in the night\nElectronic pulses of light\nSynthesized reality\nIn a world of virtuality",
      audio_url: "https://example.com/audio/song3.mp3"
    },
    { 
      id: "4", 
      title: "Rock Anthem", 
      user: "emma@example.com", 
      description: "A powerful rock anthem with guitar solos and motivational lyrics", 
      genre: "Rock", 
      status: "in_progress",
      created_at: "2023-04-12"
    },
    { 
      id: "5", 
      title: "Acoustic Memories", 
      user: "david@example.com", 
      description: "A gentle acoustic song about childhood memories", 
      genre: "Folk", 
      status: "completed",
      created_at: "2023-04-10",
      lyrics: "Childhood days under the sun\nRunning through fields having fun\nMemories etched in my mind\nThose simple days were so kind",
      audio_url: "https://example.com/audio/song5.mp3"
    },
  ]);

  if (!isAdmin()) {
    return <Navigate to="/dashboard" />;
  }

  const filteredRequests = songRequests.filter(request => {
    const matchesSearch = 
      request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.genre.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = 
      activeTab === "all" || 
      (activeTab === "pending" && request.status === "pending") ||
      (activeTab === "in_progress" && (request.status === "in_progress" || request.status === "lyrics_review")) ||
      (activeTab === "completed" && request.status === "completed");
      
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "lyrics_review":
        return "bg-purple-100 text-purple-800";
      case "completed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string): string => {
    switch(status) {
      case "pending":
        return "Pending";
      case "in_progress":
        return "In Progress";
      case "lyrics_review":
        return "Lyrics Review";
      case "completed":
        return "Completed";
      default:
        return status;
    }
  };

  const handleStartWork = (id: string) => {
    setSongRequests(songRequests.map(request => 
      request.id === id ? {...request, status: "in_progress"} : request
    ));
    
    toast({
      title: "Request Updated",
      description: "Song request marked as in progress.",
    });
  };

  const handleWriteLyrics = (id: string) => {
    setSelectedRequest(id);
    const request = songRequests.find(r => r.id === id);
    setLyricsDraft(request?.lyrics || "");
  };

  const handleSaveLyrics = () => {
    if (!selectedRequest) return;
    
    setSongRequests(songRequests.map(request => 
      request.id === selectedRequest 
        ? {...request, lyrics: lyricsDraft, status: "lyrics_review"} 
        : request
    ));
    
    setSelectedRequest(null);
    
    toast({
      title: "Lyrics Saved",
      description: "Lyrics have been sent to user for review.",
    });
  };

  const handleUploadAudio = (id: string) => {
    setUploadingAudio(true);
    
    setTimeout(() => {
      setSongRequests(songRequests.map(request => 
        request.id === id 
          ? {
              ...request, 
              status: "completed", 
              audio_url: `https://example.com/audio/song${id}.mp3`,
              lyrics: request.lyrics || ""
            } 
          : request
      ));
      
      setUploadingAudio(false);
      
      toast({
        title: "Audio Uploaded",
        description: "Custom song has been completed and is ready for delivery.",
      });
    }, 1500);
  };

  const renderStatusLabel = (status: string): ReactNode => {
    return getStatusLabel(status);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Custom Song Management</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Custom Song Requests</CardTitle>
          <CardDescription>Manage and fulfill custom song requests from users</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
            <div className="flex justify-between mb-6">
              <TabsList>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="all">All Requests</TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-2">
                <Input 
                  placeholder="Search requests..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-xs"
                  prefix={<Search className="h-4 w-4 text-muted-foreground" />}
                />
              </div>
            </div>

            <TabsContent value="pending" className="space-y-4">
              {renderRequestsList()}
            </TabsContent>
            
            <TabsContent value="in_progress" className="space-y-4">
              {renderRequestsList()}
            </TabsContent>
            
            <TabsContent value="completed" className="space-y-4">
              {renderRequestsList()}
            </TabsContent>
            
            <TabsContent value="all" className="space-y-4">
              {renderRequestsList()}
            </TabsContent>
          </Tabs>
          
          {selectedRequest && (
            <div className="mt-6 border-t pt-6">
              <h3 className="text-lg font-medium mb-4">
                Write Lyrics for "{songRequests.find(r => r.id === selectedRequest)?.title}"
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="song-description">Song Description</Label>
                  <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted/30 rounded-md">
                    {songRequests.find(r => r.id === selectedRequest)?.description}
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="lyrics">Lyrics</Label>
                  <Textarea 
                    id="lyrics" 
                    className="h-64 font-mono"
                    value={lyricsDraft}
                    onChange={(e) => setLyricsDraft(e.target.value)}
                    placeholder="Write song lyrics here..."
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleSaveLyrics}>
                    <Check className="h-4 w-4 mr-2" />
                    Save Lyrics
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  function renderRequestsList() {
    if (filteredRequests.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No song requests found matching your criteria.
        </div>
      );
    }
    
    return filteredRequests.map((request, index) => (
      <Card key={index} className="overflow-hidden">
        <CardContent className="p-0">
          <div className="p-6">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-bold text-lg">{request.title}</h3>
                <p className="text-sm text-muted-foreground">
                  Requested by {request.user} • {request.genre} • {request.created_at}
                </p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(request.status)}`}>
                {renderStatusLabel(request.status)}
              </span>
            </div>
            
            <p className="text-sm mb-4">{request.description}</p>
            
            {request.lyrics && request.status !== "pending" && (
              <div className="mb-4">
                <Label className="text-sm font-medium">Lyrics</Label>
                <div className="mt-1 p-3 bg-muted/30 rounded-md whitespace-pre-line text-sm">
                  {request.lyrics}
                </div>
              </div>
            )}
            
            {request.audio_url && (
              <div className="mb-4">
                <Label className="text-sm font-medium">Final Audio</Label>
                <div className="mt-1">
                  <audio controls className="w-full">
                    <source src={request.audio_url} type="audio/mp3" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-2 mt-4">
              {request.status === "pending" && (
                <Button variant="outline" onClick={() => handleStartWork(request.id)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Start Work
                </Button>
              )}
              
              {request.status === "in_progress" && (
                <Button onClick={() => handleWriteLyrics(request.id)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Write Lyrics
                </Button>
              )}
              
              {request.status === "lyrics_review" && (
                <Button disabled={uploadingAudio} onClick={() => handleUploadAudio(request.id)}>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingAudio ? "Uploading..." : "Upload Final Song"}
                </Button>
              )}
              
              {request.status === "completed" && (
                <Button variant="outline" onClick={() => toast({ title: "Message Sent", description: "User has been notified about song completion." })}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message User
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    ));
  }
};

export default CustomSongManagement;
