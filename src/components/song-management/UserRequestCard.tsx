import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Music, Calendar, Clock, Edit, CheckCircle, XCircle, Download, Eye, EyeOff } from "lucide-react";
import { CustomSongRequest } from "@/hooks/use-admin-song-requests";
import { UserLyricsManager } from "./UserLyricsManager";
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", label: "In Queue", icon: Clock },
      lyrics_proposed: { color: "bg-blue-100 text-blue-800", label: "Review Lyrics", icon: Music },
      lyrics_selected: { color: "bg-purple-100 text-purple-800", label: "Creating Song", icon: Music },
      audio_uploaded: { color: "bg-orange-100 text-orange-800", label: "Song Ready", icon: Download },
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

  const handleDownloadAudio = async () => {
    try {
      setDownloadingAudio(true);
      console.log('Starting download for request:', request.id);

      // Fetch audio records without any complex conditions
      const { data: audioData, error: audioError } = await supabase
        .from('custom_song_audio')
        .select('*')
        .eq('request_id', request.id)
        .order('created_at', { ascending: false });

      console.log('Audio query result:', { audioData, audioError, requestId: request.id });

      if (audioError) {
        console.error('Database error:', audioError);
        toast.error('Database error: ' + audioError.message);
        return;
      }

      if (!audioData || audioData.length === 0) {
        console.error('No audio records found for request:', request.id);
        toast.error('No audio files found for this request');
        return;
      }

      console.log('Found audio records:', audioData);

      // Get the selected audio file or the most recent one
      let audioRecord = audioData.find(record => record.is_selected === true);
      if (!audioRecord) {
        console.log('No selected audio found, using most recent');
        audioRecord = audioData[0]; // Already ordered by created_at desc
      }

      console.log('Using audio record:', audioRecord);

      if (!audioRecord.audio_url) {
        console.error('Audio record missing URL:', audioRecord);
        toast.error('Audio file URL is missing');
        return;
      }

      console.log('Attempting download from URL:', audioRecord.audio_url);

      // Try to download the file directly
      try {
        const response = await fetch(audioRecord.audio_url, {
          method: 'GET',
          headers: {
            'Accept': 'audio/*',
          }
        });

        console.log('Fetch response status:', response.status, response.statusText);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        console.log('Content type:', contentType);

        const blob = await response.blob();
        console.log('Downloaded blob:', {
          size: blob.size,
          type: blob.type
        });

        if (blob.size === 0) {
          throw new Error('Downloaded file is empty');
        }

        // Create and trigger download
        const sanitizedTitle = request.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
        const fileName = `${sanitizedTitle}_custom_song.mp3`;
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 1000);

        console.log('Download completed successfully');
        toast.success('Audio file downloaded successfully!');
        
      } catch (fetchError: any) {
        console.error('Fetch error details:', fetchError);
        toast.error('Failed to download audio file: ' + fetchError.message);
      }
      
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error('Failed to download audio file: ' + error.message);
    } finally {
      setDownloadingAudio(false);
    }
  };

  const canManageLyrics = request.status === 'lyrics_proposed';
  const showLyricsButton = ['lyrics_proposed', 'lyrics_selected', 'audio_uploaded', 'completed'].includes(request.status);
  const canDownloadAudio = ['audio_uploaded', 'completed'].includes(request.status);

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
        
        {request.status === 'audio_uploaded' && (
          <div className="text-center py-6">
            <Download className="h-12 w-12 text-orange-600 mx-auto mb-3" />
            <h4 className="font-semibold mb-2">Your Song is Ready!</h4>
            <p className="text-muted-foreground mb-4">
              Your custom song has been created and is ready for download.
            </p>
            <Button 
              className="bg-melody-secondary hover:bg-melody-secondary/90"
              onClick={handleDownloadAudio}
              disabled={downloadingAudio}
            >
              <Download className="h-4 w-4 mr-2" />
              {downloadingAudio ? "Downloading..." : "Download Song"}
            </Button>
          </div>
        )}
        
        {request.status === 'completed' && (
          <div className="text-center py-6">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <h4 className="font-semibold mb-2">Song Completed!</h4>
            <p className="text-muted-foreground mb-4">
              Your custom song request has been completed. Thank you for using our service!
            </p>
            <Button 
              className="bg-melody-secondary hover:bg-melody-secondary/90"
              onClick={handleDownloadAudio}
              disabled={downloadingAudio}
            >
              <Download className="h-4 w-4 mr-2" />
              {downloadingAudio ? "Downloading..." : "Download Song"}
            </Button>
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
