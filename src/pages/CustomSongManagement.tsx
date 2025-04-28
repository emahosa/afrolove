
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useSongRequests } from "@/hooks/use-song-requests";
import { SongRequestCard } from "@/components/song-management/SongRequestCard";
import { LyricsEditor } from "@/components/song-management/LyricsEditor";

const CustomSongManagement = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  
  const {
    songRequests,
    selectedRequest,
    lyricsDraft,
    uploadingAudio,
    setLyricsDraft,
    handleStartWork,
    handleWriteLyrics,
    handleSaveLyrics,
    handleUploadAudio,
    setSelectedRequest
  } = useSongRequests();

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

  const renderRequestsList = () => {
    if (filteredRequests.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No song requests found matching your criteria.
        </div>
      );
    }
    
    return filteredRequests.map((request) => (
      <SongRequestCard
        key={request.id}
        request={request}
        uploadingAudio={uploadingAudio}
        onStartWork={handleStartWork}
        onWriteLyrics={handleWriteLyrics}
        onUploadAudio={handleUploadAudio}
      />
    ));
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
          
          <LyricsEditor
            selectedRequest={songRequests.find(r => r.id === selectedRequest)}
            lyricsDraft={lyricsDraft}
            onLyricsChange={setLyricsDraft}
            onSave={handleSaveLyrics}
            onCancel={() => setSelectedRequest(null)}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomSongManagement;
