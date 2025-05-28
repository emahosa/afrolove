
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CustomSongRequest } from "@/hooks/use-custom-song-requests";
import { AdminSongRequestCard } from "./AdminSongRequestCard";

interface AdminSongRequestTabsProps {
  songRequests: CustomSongRequest[];
  onStartWork: (id: string) => void;
  onUpdateStatus: (id: string, status: CustomSongRequest['status']) => void;
}

export const AdminSongRequestTabs = ({
  songRequests,
  onStartWork,
  onUpdateStatus,
}: AdminSongRequestTabsProps) => {
  
  // Filter requests for each tab
  const pendingRequests = songRequests.filter(r => r.status === "pending");
  const lyricsUploadedRequests = songRequests.filter(r => r.status === "lyrics_uploaded");
  const instrumentalReadyRequests = songRequests.filter(r => r.status === "instrumental_ready");
  const completedRequests = songRequests.filter(r => r.status === "completed");

  return (
    <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">All Requests ({songRequests.length})</TabsTrigger>
        <TabsTrigger value="pending">Pending ({pendingRequests.length})</TabsTrigger>
        <TabsTrigger value="lyrics_uploaded">Lyrics Ready ({lyricsUploadedRequests.length})</TabsTrigger>
        <TabsTrigger value="instrumental_ready">Instrumental Ready ({instrumentalReadyRequests.length})</TabsTrigger>
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
            />
          ))
        )}
      </TabsContent>
      
      <TabsContent value="lyrics_uploaded" className="space-y-4">
        {lyricsUploadedRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No requests with lyrics uploaded.
          </div>
        ) : (
          lyricsUploadedRequests.map(request => (
            <AdminSongRequestCard
              key={request.id}
              request={request}
              onStartWork={onStartWork}
              onUpdateStatus={onUpdateStatus}
            />
          ))
        )}
      </TabsContent>
      
      <TabsContent value="instrumental_ready" className="space-y-4">
        {instrumentalReadyRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No requests ready for instrumental.
          </div>
        ) : (
          instrumentalReadyRequests.map(request => (
            <AdminSongRequestCard
              key={request.id}
              request={request}
              onStartWork={onStartWork}
              onUpdateStatus={onUpdateStatus}
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
            />
          ))
        )}
      </TabsContent>
    </Tabs>
  );
};
