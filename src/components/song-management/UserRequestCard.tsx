import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Music, Calendar, Clock, CheckCircle, Download, Eye, EyeOff, Trash2 } from "lucide-react";
import { CustomSongRequest } from "@/hooks/use-admin-song-requests";
import { UserLyricsManager } from "./UserLyricsManager";
import { CompletedSongItem } from "./CompletedSongItem";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface UserRequestCardProps {
  request: CustomSongRequest;
  onUpdate: () => void;
}

export const UserRequestCard = ({ request, onUpdate }: UserRequestCardProps) => {
  const { user } = useAuth();
  const [showLyrics, setShowLyrics] = useState(false);
  const [downloadingAudio, setDownloadingAudio] = useState(false);

  const handleDownloadAudio = async (targetRequest?: CustomSongRequest) => {
    const requestToDownload = targetRequest || request;
    try {
      setDownloadingAudio(true);
      console.log('User Dashboard: Starting download for request:', requestToDownload.id);

      const { data: audioData, error: audioError } = await supabase
        .from('custom_song_audio')
        .select('*')
        .eq('request_id', requestToDownload.id)
        .order('created_at', { ascending: false });

      if (audioError) {
        console.error('User Dashboard: Database error:', audioError);
        toast.error('Failed to fetch audio data: ' + audioError.message);
        return;
      }

      if (!audioData || audioData.length === 0) {
        console.error('User Dashboard: No audio records found for request:', requestToDownload.id);
        toast.error('No audio files found for this request. Please contact support if this seems incorrect.');
        return;
      }

      let audioRecord = audioData.find(record => record.is_selected === true);
      if (!audioRecord) {
        audioRecord = audioData[0];
      }

      if (!audioRecord?.audio_url) {
        console.error('User Dashboard: Audio record missing URL:', audioRecord);
        toast.error('Audio file URL is missing');
        return;
      }

      const response = await fetch(audioRecord.audio_url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('Downloaded file is empty');
      }

      const sanitizedTitle = requestToDownload.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const fileName = `${sanitizedTitle}_custom_song.mp3`;
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);

      toast.success('Audio file downloaded successfully!');
      
    } catch (error: any) {
      console.error('User Dashboard: Download error:', error);
      toast.error('Failed to download audio file: ' + error.message);
    } finally {
      setDownloadingAudio(false);
    }
  };

  const handleDelete = (requestId: string) => {
    console.log('UserRequestCard: Song deleted, triggering parent update for request:', requestId);
    // Immediately call parent update to refresh the list
    onUpdate();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", label: "In Queue", icon: Clock },
      lyrics_proposed: { color: "bg-blue-100 text-blue-800", label: "Review Lyrics", icon: Music },
      lyrics_selected: { color: "bg-purple-100 text-purple-800", label: "Creating Song", icon: Music },
      audio_uploaded: { color: "bg-purple-100 text-purple-800", label: "Song Ready", icon: Download },
      completed: { color: "bg-green-100 text-green-800", label: "Completed", icon: CheckCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canManageLyrics = request.status === 'lyrics_proposed';
  const showLyricsButton = ['lyrics_proposed', 'lyrics_selected', 'audio_uploaded', 'completed'].includes(request.status);

  // Use the new minimalistic design for completed songs
  if (request.status === 'completed' || request.status === 'audio_uploaded') {
    return (
      <CompletedSongItem
        request={request}
        onDownload={() => handleDownloadAudio(request)}
        onDelete={() => handleDelete(request.id)}
        downloadingAudio={downloadingAudio}
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-xl">{request.title}</CardTitle>
            <CardDescription className="mt-2">
              {request.description}
            </CardDescription>
          </div>
          {getStatusBadge(request.status)}
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Requested: {formatDate(request.created_at)}</span>
          </div>
          {request.updated_at !== request.created_at && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Updated: {formatDate(request.updated_at)}</span>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Status-specific content */}
        {request.status === 'pending' && (
          <div className="text-center py-6">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h4 className="font-semibold mb-2">Your Request is in Queue</h4>
            <p className="text-muted-foreground">
              Our team will start working on your custom lyrics soon. You'll be notified when they're ready for review.
            </p>
          </div>
        )}
        
        {request.status === 'lyrics_selected' && (
          <div className="text-center py-6">
            <Music className="h-12 w-12 text-purple-600 mx-auto mb-3" />
            <h4 className="font-semibold mb-2">Creating Your Song</h4>
            <p className="text-muted-foreground">
              Lyrics have been finalized. Our team is now creating your custom song!
            </p>
          </div>
        )}

        {/* Lyrics management section */}
        {showLyricsButton && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center mb-4">
              <h5 className="font-medium">Lyrics</h5>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowLyrics(!showLyrics)}
              >
                {showLyrics ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide Lyrics
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    View Lyrics
                  </>
                )}
              </Button>
            </div>

            {showLyrics && (
              <UserLyricsManager 
                request={request} 
                onUpdate={onUpdate}
                canEdit={canManageLyrics}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
