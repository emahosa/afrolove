import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Search, RefreshCw, Music } from "lucide-react";
import { useAdminSongRequests } from "@/hooks/use-admin-song-requests";
import { AdminLyricsEditor } from "@/components/song-management/AdminLyricsEditor";
import { AdminSongRequestTabs } from "@/components/song-management/AdminSongRequestTabs";
import { Button } from "@/components/ui/button";
import { CustomSongLyrics } from "@/integrations/supabase/types"; // Import this type if not already

const CustomSongManagement = () => {
  const { isAdmin, isSuperAdmin, hasAdminPermission, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  
  const {
    allRequests,
    loading,
    error,
    updateRequestStatus,
    addLyrics,
    fetchLyricsForRequest, // This is the correct function for fetching lyrics for a request to display
    fetchSelectedLyrics, // This might be for a different purpose or if it returns the specific type
    refetch
  } = useAdminSongRequests();

  // Check admin access with permission
  if (!isSuperAdmin() && !hasAdminPermission('custom-songs')) {
    return <Navigate to="/dashboard" />;
  }

  const filteredRequests = allRequests.filter(request => {
    const matchesSearch = 
      request.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (request.user_id && request.user_id.toLowerCase().includes(searchQuery.toLowerCase())) || // Check if user_id exists
      request.title.toLowerCase().includes(searchQuery.toLowerCase());
      
    return matchesSearch;
  });

  const handleStartWork = async (requestId: string) => {
    console.log('Admin: Starting work on request (opening editor):', requestId);
    // Don't update status yet - just open the editor
    setSelectedRequestId(requestId);
  };

  const handleUploadLyricsForEditor = async (requestId: string, lyrics1: string, lyrics2: string): Promise<boolean> => {
    try {
      console.log('Admin: Uploading lyrics for request:', requestId);
      await addLyrics(requestId, lyrics1, 1); // This comes from useAdminSongRequests
      await addLyrics(requestId, lyrics2, 2); // This comes from useAdminSongRequests
      // Only now update the status to lyrics_proposed
      await updateRequestStatus(requestId, 'lyrics_proposed'); // This comes from useAdminSongRequests
      setSelectedRequestId(null);
      refetch(); // Refetch requests to update the list
      return true;
    } catch (error) {
      console.error('Error uploading lyrics:', error);
      return false;
    }
  };
  
  const handleFetchLyricsForTab = async (requestId: string): Promise<CustomSongLyrics | null> => {
    // This function is expected by AdminSongRequestTabs for its 'fetchSelectedLyrics' prop
    // It should fetch the *selected* lyrics for display in the tab.
    // useAdminSongRequests has `fetchSelectedLyrics` which seems appropriate.
    // Ensure it matches the expected return type.
    // If fetchSelectedLyrics from the hook returns Promise<CustomSongLyrics[]>, adapt it.
    // For now, assuming fetchSelectedLyrics from hook returns a single CustomSongLyrics or null/undefined
     try {
        const lyrics = await fetchSelectedLyrics(requestId); // from useAdminSongRequests
        return lyrics || null; // ensure it returns CustomSongLyrics or null
    } catch (err) {
        console.error("Failed to fetch selected lyrics for tab", err);
        return null;
    }
  };

  const handleRefresh = () => {
    console.log('Admin: Manual refresh triggered');
    refetch();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-melody-primary"></div>
        <span className="ml-2">Loading requests...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Custom Song Management</h1>
        <Button onClick={handleRefresh} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/15 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive font-semibold">Error loading requests:</p>
          <p className="text-destructive/80">{error}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Custom Song Requests ({allRequests.length})
          </CardTitle>
          <CardDescription>
            Manage and fulfill custom song requests from users
          </CardDescription>
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
          
          {filteredRequests.length === 0 && !searchQuery ? (
            <div className="text-center py-12">
              <Music className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No custom song requests found</h3>
              <p className="text-muted-foreground">
                Song requests will appear here when users submit them.
              </p>
            </div>
          ) : filteredRequests.length === 0 && searchQuery ? (
            <div className="text-center py-12">
              <Search className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No requests match your search</h3>
              <p className="text-muted-foreground">
                Try a different search term.
              </p>
            </div>
          ) : (
            <AdminSongRequestTabs
              songRequests={filteredRequests} // Pass filtered requests
              onStartWork={handleStartWork} // Correct: (requestId: string) => void
              onUpdateStatus={updateRequestStatus} // Correct: from hook (requestId: string, status: CustomSongStatus) => Promise<void>
              fetchSelectedLyrics={handleFetchLyricsForTab} // Corrected: (requestId: string) => Promise<CustomSongLyrics | null>
            />
          )}
          
          <AdminLyricsEditor
            selectedRequestId={selectedRequestId}
            onUploadLyrics={handleUploadLyricsForEditor} // Corrected: (requestId: string, lyrics1: string, lyrics2: string) => Promise<boolean>
            onCancel={() => setSelectedRequestId(null)}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomSongManagement;
