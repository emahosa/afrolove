
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RequestStatusBadge } from "./RequestStatusBadge";
import { Edit, MessageSquare, Plus, Upload } from "lucide-react";
import { SongRequest } from "@/hooks/use-song-requests";
import { toast } from "sonner";

type SongRequestCardProps = {
  request: SongRequest;
  uploadingAudio: boolean;
  onStartWork: (id: string) => void;
  onWriteLyrics: (id: string) => void;
  onUploadAudio: (id: string) => void;
};

export const SongRequestCard = ({
  request,
  uploadingAudio,
  onStartWork,
  onWriteLyrics,
  onUploadAudio,
}: SongRequestCardProps) => {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="p-6">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-bold text-lg">{request.title}</h3>
              <p className="text-sm text-muted-foreground">
                Requested by {request.user} • {request.genre} • {request.created_at}
              </p>
            </div>
            <RequestStatusBadge status={request.status} />
          </div>
          
          <p className="text-sm mb-4">{request.description}</p>
          
          {request.lyrics && request.status !== "pending" && (
            <div className="mb-4">
              <Label className="text-sm font-medium">Lyrics</Label>
              <div className="mt-1 p-3 bg-muted/30 rounded-md whitespace-pre-line text-sm">
                {request.lyrics}
              </div>
            </div>
          )}
          
          {request.audio_url && (
            <div className="mb-4">
              <Label className="text-sm font-medium">Final Audio</Label>
              <div className="mt-1">
                <audio controls className="w-full">
                  <source src={request.audio_url} type="audio/mp3" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-2 mt-4">
            {request.status === "pending" && (
              <Button variant="outline" onClick={() => onStartWork(request.id)}>
                <Plus className="h-4 w-4 mr-2" />
                Start Work
              </Button>
            )}
            
            {request.status === "in_progress" && (
              <Button onClick={() => onWriteLyrics(request.id)}>
                <Edit className="h-4 w-4 mr-2" />
                Write Lyrics
              </Button>
            )}
            
            {request.status === "lyrics_review" && (
              <Button disabled={uploadingAudio} onClick={() => onUploadAudio(request.id)}>
                <Upload className="h-4 w-4 mr-2" />
                {uploadingAudio ? "Uploading..." : "Upload Final Song"}
              </Button>
            )}
            
            {request.status === "completed" && (
              <Button 
                variant="outline" 
                onClick={() => toast("Message Sent", {
                  description: "User has been notified about song completion."
                })}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Message User
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
