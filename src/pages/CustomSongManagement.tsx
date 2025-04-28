
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Music, Upload, FileMusic } from "lucide-react";

const CustomSongManagement = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const { toast } = useToast();
  
  const handleLyricsSubmit = (id: string) => {
    toast({
      title: "Lyrics Submitted",
      description: `Lyrics submitted for request #${id}`,
    });
  };

  const handleSongUpload = (id: string) => {
    toast({
      title: "Song Uploaded",
      description: `Song uploaded for request #${id}`,
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Custom Song Management</h1>
        <div className="flex space-x-2">
          <Button variant="outline">
            <FileMusic className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full mb-6">
          <TabsTrigger value="pending">Pending Requests</TabsTrigger>
          <TabsTrigger value="lyrics">Lyrics Submitted</TabsTrigger>
          <TabsTrigger value="approved">Lyrics Approved</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        
        {/* Pending Requests Tab */}
        <TabsContent value="pending" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Song Requests</CardTitle>
              <CardDescription>New customer requests waiting for lyrics</CardDescription>
            </CardHeader>
            <CardContent>
              {[
                { id: "SR-1234", user: "john@example.com", title: "Summer Love Song", genre: "Pop", description: "Upbeat summer song with romantic lyrics", date: "2023-04-15" },
                { id: "SR-1235", user: "sarah@example.com", title: "Winter Blues", genre: "Jazz", description: "Melancholic jazz tune about winter", date: "2023-04-14" },
                { id: "SR-1236", user: "mike@example.com", title: "Rock Anthem", genre: "Rock", description: "Energetic rock anthem for concerts", date: "2023-04-13" },
              ].map((request, index) => (
                <div key={index} className="mb-6 border rounded-lg p-4">
                  <div className="flex justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold">{request.title}</h3>
                      <p className="text-sm text-muted-foreground">Requested by {request.user} on {request.date}</p>
                    </div>
                    <div className="text-sm">
                      <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs">
                        Pending
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium">Request ID</p>
                      <p>{request.id}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Genre</p>
                      <p>{request.genre}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <p>Awaiting Lyrics</p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm font-medium">Description</p>
                    <p className="text-sm">{request.description}</p>
                  </div>
                  
                  <div className="border-t pt-4">
                    <Label htmlFor={`lyrics-${request.id}`} className="mb-2 block">Create Lyrics</Label>
                    <Textarea 
                      id={`lyrics-${request.id}`}
                      placeholder="Enter song lyrics here..."
                      className="mb-3 h-32"
                    />
                    <div className="flex justify-end">
                      <Button onClick={() => handleLyricsSubmit(request.id)}>
                        Submit Lyrics
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Lyrics Submitted Tab */}
        <TabsContent value="lyrics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lyrics Submitted</CardTitle>
              <CardDescription>Requests with lyrics waiting for customer approval</CardDescription>
            </CardHeader>
            <CardContent>
              {[
                { id: "SR-1230", user: "emma@example.com", title: "Midnight Dreams", genre: "R&B", description: "Smooth R&B track about late nights", date: "2023-04-10", lyrics: "Verse 1:\nIn the midnight hour\nWhen the world is still\nI can hear your voice\nCalling from the hill\n\nChorus:\nMidnight dreams, they come and go\nMidnight dreams, they steal the show" },
                { id: "SR-1231", user: "david@example.com", title: "Ocean Waves", genre: "Ambient", description: "Relaxing ambient track inspired by the ocean", date: "2023-04-09", lyrics: "Verse 1:\nWaves crash on the shore\nEndless as time itself\nCleansing my troubled mind\n\nChorus:\nOcean waves, carry me home\nOcean waves, never alone" },
              ].map((request, index) => (
                <div key={index} className="mb-6 border rounded-lg p-4">
                  <div className="flex justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold">{request.title}</h3>
                      <p className="text-sm text-muted-foreground">Requested by {request.user} on {request.date}</p>
                    </div>
                    <div className="text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        Waiting Approval
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium">Request ID</p>
                      <p>{request.id}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Genre</p>
                      <p>{request.genre}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <p>Pending Customer Approval</p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm font-medium">Description</p>
                    <p className="text-sm">{request.description}</p>
                  </div>
                  
                  <div className="border-t border-b py-4 mb-4">
                    <p className="font-medium mb-2">Submitted Lyrics</p>
                    <div className="bg-muted p-3 rounded whitespace-pre-wrap text-sm">
                      {request.lyrics}
                    </div>
                  </div>
                  
                  <div className="text-center text-sm text-muted-foreground">
                    Waiting for customer to approve these lyrics
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Lyrics Approved Tab */}
        <TabsContent value="approved" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lyrics Approved</CardTitle>
              <CardDescription>Requests with approved lyrics waiting for song production</CardDescription>
            </CardHeader>
            <CardContent>
              {[
                { id: "SR-1229", user: "alex@example.com", title: "Dance All Night", genre: "Electronic", description: "Club track with a strong beat", date: "2023-04-08", lyrics: "Verse 1:\nLights flashing across the floor\nBodies moving, wanting more\nThe beat drops and we lose control\n\nChorus:\nDance all night, until the morning light\nDance all night, everything feels right" },
              ].map((request, index) => (
                <div key={index} className="mb-6 border rounded-lg p-4">
                  <div className="flex justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold">{request.title}</h3>
                      <p className="text-sm text-muted-foreground">Requested by {request.user} on {request.date}</p>
                    </div>
                    <div className="text-sm">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                        Lyrics Approved
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium">Request ID</p>
                      <p>{request.id}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Genre</p>
                      <p>{request.genre}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <p>Ready for Production</p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm font-medium">Description</p>
                    <p className="text-sm">{request.description}</p>
                  </div>
                  
                  <div className="border-t border-b py-4 mb-4">
                    <p className="font-medium mb-2">Approved Lyrics</p>
                    <div className="bg-muted p-3 rounded whitespace-pre-wrap text-sm">
                      {request.lyrics}
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="mb-4">
                      <Label htmlFor={`song-file-${request.id}`} className="mb-2 block">Upload Finished Song</Label>
                      <div className="flex space-x-2">
                        <Input 
                          id={`song-file-${request.id}`}
                          type="file"
                          accept="audio/*"
                        />
                        <Button onClick={() => handleSongUpload(request.id)}>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Completed Tab */}
        <TabsContent value="completed" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Completed Requests</CardTitle>
              <CardDescription>Successfully completed custom song requests</CardDescription>
            </CardHeader>
            <CardContent>
              {[
                { id: "SR-1225", user: "brian@example.com", title: "Mountain High", genre: "Folk", description: "Inspirational folk song about climbing mountains", date: "2023-04-05", completed: "2023-04-12", song_url: "#" },
                { id: "SR-1226", user: "lisa@example.com", title: "Rainy Day", genre: "Acoustic", description: "Melancholic acoustic song about rainy days", date: "2023-04-03", completed: "2023-04-10", song_url: "#" },
              ].map((request, index) => (
                <div key={index} className="mb-4 border rounded-lg p-4">
                  <div className="flex justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold">{request.title}</h3>
                      <p className="text-sm text-muted-foreground">Requested by {request.user}</p>
                    </div>
                    <div className="text-sm">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                        Completed
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium">Request ID</p>
                      <p>{request.id}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Genre</p>
                      <p>{request.genre}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Requested</p>
                      <p>{request.date}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Completed</p>
                      <p>{request.completed}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <Button size="sm" variant="outline">
                      <Music className="h-4 w-4 mr-2" />
                      Play Song
                    </Button>
                    <Button size="sm" variant="outline">
                      <FileMusic className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomSongManagement;
