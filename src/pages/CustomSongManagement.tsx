
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Search, RefreshCw, AlertCircle } from "lucide-react";
import { useAdminSongRequests } from "@/hooks/use-admin-song-requests";
import { AdminLyricsEditor } from "@/components/song-management/AdminLyricsEditor";
import { AdminSongRequestTabs } from "@/components/song-management/AdminSongRequestTabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

const CustomSongManagement = () => {
  const { isAdmin, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  
  const {
    allRequests,
    loading,
    error,
    updateRequestStatus,
    addLyrics,
    fetchLyricsForRequest,
    refetch
  } = useAdminSongRequests();

  if (!isAdmin()) {
    return <Navigate to="/dashboard" />;
  }

  useEffect(() => {
    console.log('CustomSongManagement: User info:', {
      userId: user?.id,
      email: user?.email,
      isAdmin: isAdmin()
    });
    console.log('CustomSongManagement: All requests updated:', allRequests);
  }, [allRequests, user]);

  const filteredRequests = allRequests.filter(request => {
    const matchesSearch = 
      request.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.title.toLowerCase().includes(searchQuery.toLowerCase());
      
    return matchesSearch;
  });

  const handleStartWork = async (requestId: string) => {
    console.log('Admin: Starting work on request:', requestId);
    await updateRequestStatus(requestId, 'lyrics_proposed');
    setSelectedRequestId(requestId);
  };

  const handleUploadLyrics = async (requestId: string, lyrics1: string, lyrics2: string) => {
    try {
      console.log('Admin: Uploading lyrics for request:', requestId);
      await addLyrics(requestId, lyrics1, 1);
      await addLyrics(requestId, lyrics2, 2);
      await updateRequestStatus(requestId, 'lyrics_proposed');
      setSelectedRequestId(null);
      return true;
    } catch (error) {
      console.error('Error uploading lyrics:', error);
      return false;
    }
  };

  const handleRefresh = () => {
    console.log('Admin: Manual refresh triggered');
    refetch();
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
        <Button onClick={handleRefresh} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <div className="mt-2 text-sm">
              <p>Troubleshooting steps:</p>
              <ul className="list-disc list-inside mt-1">
                <li>Check if you have admin role assigned</li>
                <li>Verify database connection</li>
                <li>Check browser console for detailed errors</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Custom Song Requests ({allRequests.length})</CardTitle>
          <CardDescription>
            Manage and fulfill custom song requests from users
            {user && (
              <div className="text-xs text-muted-foreground mt-1">
                Logged in as: {user.email} (ID: {user.id?.slice(-8)})
              </div>
            )}
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
          
          {!error && allRequests.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No custom song requests found.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Requests will appear here when users create them.
              </p>
              <div className="mt-4 text-xs text-muted-foreground bg-muted/30 p-3 rounded">
                <p className="font-medium">Debug info:</p>
                <p>• User ID: {user?.id}</p>
                <p>• Is Admin: {isAdmin().toString()}</p>
                <p>• Error: {error || 'None'}</p>
              </div>
            </div>
          ) : (
            <AdminSongRequestTabs
              songRequests={filteredRequests}
              onStartWork={handleStartWork}
              onUpdateStatus={updateRequestStatus}
            />
          )}
          
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
