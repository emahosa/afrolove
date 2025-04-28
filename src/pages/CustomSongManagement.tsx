
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useSongRequests } from "@/hooks/use-song-requests";
import { LyricsEditor } from "@/components/song-management/LyricsEditor";
import { SongRequestTabs } from "@/components/song-management/SongRequestTabs";

const CustomSongManagement = () => {
  const { isAdmin } = useAuth();
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
    handleRecreateLyrics,
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
      
    return matchesSearch;
  });

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
          <div className="flex justify-end mb-6">
            <div className="flex items-center gap-2">
              <Input 
                placeholder="Search requests..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
              />
              <Search className="text-muted-foreground" />
            </div>
          </div>
          
          <SongRequestTabs
            songRequests={filteredRequests}
            uploadingAudio={uploadingAudio}
            onStartWork={handleStartWork}
            onWriteLyrics={handleWriteLyrics}
            onUploadAudio={handleUploadAudio}
            onRecreateLyrics={handleRecreateLyrics}
          />
          
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
