
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Search, RefreshCw, AlertCircle, Database } from "lucide-react";
import { useAdminSongRequests } from "@/hooks/use-admin-song-requests";
import { AdminLyricsEditor } from "@/components/song-management/AdminLyricsEditor";
import { AdminSongRequestTabs } from "@/components/song-management/AdminSongRequestTabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

const CustomSongManagement = () => {
  const { isAdmin, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
  const {
    allRequests,
    loading,
    error,
    updateRequestStatus,
    addLyrics,
    fetchLyricsForRequest,
    refetch
  } = useAdminSongRequests();

  // Check admin access - allow super admin bypass
  const isSuperAdmin = user?.email === "ellaadahosa@gmail.com";
  if (!isSuperAdmin && !isAdmin()) {
    return <Navigate to="/dashboard" />;
  }

  useEffect(() => {
    console.log('CustomSongManagement: Component mounted with user:', {
      userId: user?.id,
      email: user?.email,
      isAdmin: isAdmin(),
      isSuperAdmin
    });
    console.log('CustomSongManagement: Requests state:', {
      requestsCount: allRequests.length,
      loading,
      error,
      requests: allRequests.map(r => ({ id: r.id, title: r.title, status: r.status }))
    });
  }, [allRequests, user, loading, error, isAdmin, isSuperAdmin]);

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

  const handleDebugTest = async () => {
    console.log('Admin: Running debug test...');
    try {
      // Test direct database connection
      const { data: testData, error: testError } = await supabase
        .from('custom_song_requests')
        .select('*');
        
      console.log('Debug test result:', { testData, testError });
      setDebugInfo({ testData, testError, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('Debug test failed:', error);
      setDebugInfo({ error: error.message, timestamp: new Date().toISOString() });
    }
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
        <div className="flex gap-2">
          <Button onClick={handleDebugTest} variant="outline" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Debug Test
          </Button>
          <Button onClick={handleRefresh} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p><strong>Error:</strong> {error}</p>
              <div className="text-sm">
                <p>Troubleshooting steps:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Check if you have admin role assigned in the database</li>
                  <li>Verify Supabase connection and RLS policies</li>
                  <li>Check browser console for detailed errors</li>
                  <li>Try refreshing the page</li>
                </ul>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {debugInfo && (
        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p><strong>Debug Test Results:</strong></p>
              <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Custom Song Requests ({allRequests.length})
          </CardTitle>
          <CardDescription>
            <div className="space-y-1">
              <p>Manage and fulfill custom song requests from users</p>
              {user && (
                <div className="text-xs text-muted-foreground">
                  <p>Logged in as: <span className="font-mono">{user.email}</span></p>
                  <p>User ID: <span className="font-mono">{user.id?.slice(-8)}</span></p>
                  <p>Admin status: <span className="font-semibold">{isSuperAdmin ? 'Super Admin' : (isAdmin() ? 'Admin' : 'No')}</span></p>
                </div>
              )}
            </div>
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
          
          {allRequests.length === 0 ? (
            <div className="text-center py-8">
              <Database className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg mb-2">No custom song requests found</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>This could mean:</p>
                <ul className="list-disc list-inside">
                  <li>No requests have been created yet</li>
                  <li>All requests are filtered out by search</li>
                  <li>Database connection or permission issues</li>
                </ul>
              </div>
              <div className="mt-4 text-xs bg-muted/30 p-3 rounded max-w-md mx-auto">
                <p className="font-medium mb-2">Debug information:</p>
                <div className="text-left space-y-1">
                  <p>• User ID: <span className="font-mono">{user?.id}</span></p>
                  <p>• Email: <span className="font-mono">{user?.email}</span></p>
                  <p>• Is Super Admin: <span className="font-mono">{isSuperAdmin.toString()}</span></p>
                  <p>• Is Admin: <span className="font-mono">{isAdmin().toString()}</span></p>
                  <p>• Error: <span className="font-mono">{error || 'None'}</span></p>
                  <p>• Loading: <span className="font-mono">{loading.toString()}</span></p>
                </div>
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
