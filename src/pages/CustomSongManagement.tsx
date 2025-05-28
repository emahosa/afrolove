
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useAdminSongRequests } from "@/hooks/use-admin-song-requests";
import { AdminLyricsEditor } from "@/components/song-management/AdminLyricsEditor";
import { AdminSongRequestTabs } from "@/components/song-management/AdminSongRequestTabs";

const CustomSongManagement = () => {
  const { isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  
  const {
    allRequests,
    loading,
    updateRequestStatus,
    addLyrics,
    fetchLyricsForRequest
  } = useAdminSongRequests();

  if (!isAdmin()) {
    return <Navigate to="/dashboard" />;
  }

  const filteredRequests = allRequests.filter(request => {
    const matchesSearch = 
      request.genre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.user_id.toLowerCase().includes(searchQuery.toLowerCase());
      
    return matchesSearch;
  });

  const handleStartWork = async (requestId: string) => {
    await updateRequestStatus(requestId, 'lyrics_uploaded');
    setSelectedRequestId(requestId);
  };

  const handleUploadLyrics = async (requestId: string, lyrics1: string, lyrics2: string) => {
    try {
      await addLyrics(requestId, lyrics1, 1);
      await addLyrics(requestId, lyrics2, 2);
      await updateRequestStatus(requestId, 'lyrics_uploaded');
      setSelectedRequestId(null);
      return true;
    } catch (error) {
      console.error('Error uploading lyrics:', error);
      return false;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-melody-primary"></div>
        <span className="ml-2">Loading requests...</span>
      </div>
    );
  }

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
          
          <AdminSongRequestTabs
            songRequests={filteredRequests}
            onStartWork={handleStartWork}
            onUpdateStatus={updateRequestStatus}
          />
          
          <AdminLyricsEditor
            selectedRequestId={selectedRequestId}
            onUploadLyrics={handleUploadLyrics}
            onCancel={() => setSelectedRequestId(null)}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomSongManagement;
