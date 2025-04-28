
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SongRequest } from "@/hooks/use-song-requests";
import { SongRequestCard } from "./SongRequestCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Recreate, Check } from "lucide-react";

interface SongRequestTabsProps {
  songRequests: SongRequest[];
  uploadingAudio: boolean;
  onStartWork: (id: string) => void;
  onWriteLyrics: (id: string) => void;
  onUploadAudio: (id: string) => void;
  onRecreateLyrics: (id: string) => void;
}

export const SongRequestTabs = ({
  songRequests,
  uploadingAudio,
  onStartWork,
  onWriteLyrics,
  onUploadAudio,
  onRecreateLyrics,
}: SongRequestTabsProps) => {
  const { toast } = useToast();
  
  // Filter requests for each tab
  const pendingRequests = songRequests.filter(r => r.status === "pending");
  const inProgressRequests = songRequests.filter(r => r.status === "in_progress");
  const lyricsReviewRequests = songRequests.filter(r => 
    r.status === "lyrics_review" || 
    r.status === "lyrics_accepted" || 
    r.status === "lyrics_rejected"
  );
  const completedRequests = songRequests.filter(r => r.status === "completed");
  
  // Render request cards with appropriate buttons based on status
  const renderLyricsReview = (request: SongRequest) => {
    return (
      <div key={request.id} className="mb-4">
        <SongRequestCard 
          request={request}
          uploadingAudio={uploadingAudio}
          onStartWork={onStartWork}
          onWriteLyrics={onWriteLyrics}
          onUploadAudio={onUploadAudio}
        />
        {request.status === "lyrics_accepted" && (
          <div className="mt-2 flex justify-end">
            <Button onClick={() => onUploadAudio(request.id)}>
              <Check className="h-4 w-4 mr-2" />
              Complete Song
            </Button>
          </div>
        )}
        {request.status === "lyrics_rejected" && (
          <div className="mt-2 flex justify-end">
            <Button onClick={() => onRecreateLyrics(request.id)}>
              <Recreate className="h-4 w-4 mr-2" />
              Recreate Lyrics
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">All Requests</TabsTrigger>
        <TabsTrigger value="pending">Pending</TabsTrigger>
        <TabsTrigger value="in_progress">In Progress</TabsTrigger>
        <TabsTrigger value="lyrics_review">Lyrics Review</TabsTrigger>
        <TabsTrigger value="completed">Completed</TabsTrigger>
      </TabsList>
      
      <TabsContent value="all" className="space-y-4">
        {songRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No song requests found.
          </div>
        ) : (
          songRequests.map(request => (
            <SongRequestCard
              key={request.id}
              request={request}
              uploadingAudio={uploadingAudio}
              onStartWork={onStartWork}
              onWriteLyrics={onWriteLyrics}
              onUploadAudio={onUploadAudio}
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
            <SongRequestCard
              key={request.id}
              request={request}
              uploadingAudio={uploadingAudio}
              onStartWork={onStartWork}
              onWriteLyrics={onWriteLyrics}
              onUploadAudio={onUploadAudio}
            />
          ))
        )}
      </TabsContent>
      
      <TabsContent value="in_progress" className="space-y-4">
        {inProgressRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No requests in progress.
          </div>
        ) : (
          inProgressRequests.map(request => (
            <SongRequestCard
              key={request.id}
              request={request}
              uploadingAudio={uploadingAudio}
              onStartWork={onStartWork}
              onWriteLyrics={onWriteLyrics}
              onUploadAudio={onUploadAudio}
            />
          ))
        )}
      </TabsContent>
      
      <TabsContent value="lyrics_review" className="space-y-4">
        {lyricsReviewRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No lyrics in review.
          </div>
        ) : (
          lyricsReviewRequests.map(renderLyricsReview)
        )}
      </TabsContent>
      
      <TabsContent value="completed" className="space-y-4">
        {completedRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No completed requests.
          </div>
        ) : (
          completedRequests.map(request => (
            <SongRequestCard
              key={request.id}
              request={request}
              uploadingAudio={uploadingAudio}
              onStartWork={onStartWork}
              onWriteLyrics={onWriteLyrics}
              onUploadAudio={onUploadAudio}
            />
          ))
        )}
      </TabsContent>
    </Tabs>
  );
};
