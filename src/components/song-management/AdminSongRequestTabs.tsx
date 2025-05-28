
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CustomSongRequest, CustomSongLyrics } from "@/hooks/use-admin-song-requests";
import { AdminSongRequestCard } from "./AdminSongRequestCard";

interface AdminSongRequestTabsProps {
  songRequests: CustomSongRequest[];
  onStartWork: (id: string) => void;
  onUpdateStatus: (id: string, status: CustomSongRequest['status']) => void;
  fetchSelectedLyrics: (requestId: string) => Promise<CustomSongLyrics | null>;
}

export const AdminSongRequestTabs = ({
  songRequests,
  onStartWork,
  onUpdateStatus,
  fetchSelectedLyrics,
}: AdminSongRequestTabsProps) => {
  
  // Filter requests for each tab
  const pendingRequests = songRequests.filter(r => r.status === "pending");
  const lyricsProposedRequests = songRequests.filter(r => r.status === "lyrics_proposed");
  const lyricsSelectedRequests = songRequests.filter(r => r.status === "lyrics_selected");
  const audioUploadedRequests = songRequests.filter(r => r.status === "audio_uploaded");
  const completedRequests = songRequests.filter(r => r.status === "completed");

  return (
    <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">All Requests ({songRequests.length})</TabsTrigger>
        <TabsTrigger value="pending">Pending ({pendingRequests.length})</TabsTrigger>
        <TabsTrigger value="lyrics_proposed">Lyrics Proposed ({lyricsProposedRequests.length})</TabsTrigger>
        <TabsTrigger value="lyrics_selected">Lyrics Selected ({lyricsSelectedRequests.length})</TabsTrigger>
        <TabsTrigger value="audio_uploaded">Audio Uploaded ({audioUploadedRequests.length})</TabsTrigger>
        <TabsTrigger value="completed">Completed ({completedRequests.length})</TabsTrigger>
      </TabsList>
      
      <TabsContent value="all" className="space-y-4">
        {songRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No song requests found.
          </div>
        ) : (
          songRequests.map(request => (
            <AdminSongRequestCard
              key={request.id}
              request={request}
              onStartWork={onStartWork}
              onUpdateStatus={onUpdateStatus}
              fetchSelectedLyrics={fetchSelectedLyrics}
            />
          ))
        )}
      </TabsContent>
      
      <TabsContent value="pending" className="space-y-4">
        {pendingRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No pending requests found.
          </div>
        ) : (
          pendingRequests.map(request => (
            <AdminSongRequestCard
              key={request.id}
              request={request}
              onStartWork={onStartWork}
              onUpdateStatus={onUpdateStatus}
              fetchSelectedLyrics={fetchSelectedLyrics}
            />
          ))
        )}
      </TabsContent>
      
      <TabsContent value="lyrics_proposed" className="space-y-4">
        {lyricsProposedRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No requests with lyrics proposed.
          </div>
        ) : (
          lyricsProposedRequests.map(request => (
            <AdminSongRequestCard
              key={request.id}
              request={request}
              onStartWork={onStartWork}
              onUpdateStatus={onUpdateStatus}
              fetchSelectedLyrics={fetchSelectedLyrics}
            />
          ))
        )}
      </TabsContent>
      
      <TabsContent value="lyrics_selected" className="space-y-4">
        {lyricsSelectedRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No requests with lyrics selected.
          </div>
        ) : (
          lyricsSelectedRequests.map(request => (
            <AdminSongRequestCard
              key={request.id}
              request={request}
              onStartWork={onStartWork}
              onUpdateStatus={onUpdateStatus}
              fetchSelectedLyrics={fetchSelectedLyrics}
            />
          ))
        )}
      </TabsContent>
      
      <TabsContent value="audio_uploaded" className="space-y-4">
        {audioUploadedRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No requests with audio uploaded.
          </div>
        ) : (
          audioUploadedRequests.map(request => (
            <AdminSongRequestCard
              key={request.id}
              request={request}
              onStartWork={onStartWork}
              onUpdateStatus={onUpdateStatus}
              fetchSelectedLyrics={fetchSelectedLyrics}
            />
          ))
        )}
      </TabsContent>
      
      <TabsContent value="completed" className="space-y-4">
        {completedRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No completed requests.
          </div>
        ) : (
          completedRequests.map(request => (
            <AdminSongRequestCard
              key={request.id}
              request={request}
              onStartWork={onStartWork}
              onUpdateStatus={onUpdateStatus}
              fetchSelectedLyrics={fetchSelectedLyrics}
            />
          ))
        )}
      </TabsContent>
    </Tabs>
  );
};
