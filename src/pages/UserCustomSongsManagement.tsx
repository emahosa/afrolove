
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Music, Calendar, Clock, Plus } from "lucide-react";
import { useUserSongRequests } from "@/hooks/use-user-song-requests";
import { UserRequestCard } from "@/components/song-management/UserRequestCard";
import { CreateSongRequestDialog } from "@/components/song-management/CreateSongRequestDialog";

const UserCustomSongsManagement = () => {
  const { userRequests, loading, error, refetch } = useUserSongRequests();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const getFilteredRequests = (status?: string) => {
    if (!status) return userRequests;
    return userRequests.filter(request => request.status === status);
  };

  const pendingRequests = getFilteredRequests('pending');
  const lyricsProposedRequests = getFilteredRequests('lyrics_proposed');
  const lyricsSelectedRequests = getFilteredRequests('lyrics_selected');
  const audioUploadedRequests = getFilteredRequests('audio_uploaded');
  const completedRequests = getFilteredRequests('completed');

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-melody-primary"></div>
        <span className="ml-2">Loading your custom songs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Custom Songs Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage your custom song requests, review lyrics, and track progress.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/15 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive font-semibold">Error loading requests:</p>
          <p className="text-destructive/80">{error}</p>
        </div>
      )}

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All ({userRequests.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingRequests.length})</TabsTrigger>
          <TabsTrigger value="lyrics_review">Review ({lyricsProposedRequests.length})</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress ({lyricsSelectedRequests.length})</TabsTrigger>
          <TabsTrigger value="ready">Ready ({audioUploadedRequests.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedRequests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {userRequests.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Music className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Custom Songs Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first custom song request to get started!
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Request
                </Button>
              </CardContent>
            </Card>
          ) : (
            userRequests.map((request) => (
              <UserRequestCard 
                key={request.id} 
                request={request} 
                onUpdate={refetch}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending requests.
            </div>
          ) : (
            pendingRequests.map((request) => (
              <UserRequestCard 
                key={request.id} 
                request={request} 
                onUpdate={refetch}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="lyrics_review" className="space-y-4">
          {lyricsProposedRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No lyrics awaiting review.
            </div>
          ) : (
            lyricsProposedRequests.map((request) => (
              <UserRequestCard 
                key={request.id} 
                request={request} 
                onUpdate={refetch}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="in_progress" className="space-y-4">
          {lyricsSelectedRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No songs currently in progress.
            </div>
          ) : (
            lyricsSelectedRequests.map((request) => (
              <UserRequestCard 
                key={request.id} 
                request={request} 
                onUpdate={refetch}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="ready" className="space-y-4">
          {audioUploadedRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No songs ready for download.
            </div>
          ) : (
            audioUploadedRequests.map((request) => (
              <UserRequestCard 
                key={request.id} 
                request={request} 
                onUpdate={refetch}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No completed songs.
            </div>
          ) : (
            completedRequests.map((request) => (
              <UserRequestCard 
                key={request.id} 
                request={request} 
                onUpdate={refetch}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      <CreateSongRequestDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          setShowCreateDialog(false);
          refetch();
        }}
      />
    </div>
  );
};

export default UserCustomSongsManagement;
