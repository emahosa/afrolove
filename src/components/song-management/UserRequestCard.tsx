import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Music, Calendar, Clock, Edit, CheckCircle, XCircle, Download, Eye, EyeOff, Play, Pause } from "lucide-react";
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
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

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

  const fetchAudioUrl = async () => {
    if (audioUrl) {
      console.log('User Dashboard: Audio URL already cached:', audioUrl);
      return audioUrl;
    }
    
    try {
      setLoadingAudio(true);
      console.log('User Dashboard: Fetching audio URL for request:', request.id);

      const { data: audioData, error: audioError } = await supabase
        .from('custom_song_audio')
        .select('*')
        .eq('request_id', request.id)
        .order('created_at', { ascending: false });

      console.log('User Dashboard: Audio query result:', { audioData, audioError, requestId: request.id });

      if (audioError) {
        console.error('User Dashboard: Database error:', audioError);
        toast.error('Failed to load audio: ' + audioError.message);
        return null;
      }

      if (!audioData || audioData.length === 0) {
        console.log('User Dashboard: No audio records found for request:', request.id);
        toast.error('No audio files found for this request');
        return null;
      }

      // Get the selected audio file or the most recent one
      let audioRecord = audioData.find(record => record.is_selected === true);
      if (!audioRecord) {
        console.log('User Dashboard: No selected audio found, using most recent');
        audioRecord = audioData[0]; // Already sorted by created_at desc
      }

      console.log('User Dashboard: Using audio record:', audioRecord);

      if (!audioRecord?.audio_url) {
        console.error('User Dashboard: Audio record missing URL:', audioRecord);
        toast.error('Audio file URL is missing');
        return null;
      }

      console.log('User Dashboard: Setting audio URL:', audioRecord.audio_url);
      setAudioUrl(audioRecord.audio_url);
      return audioRecord.audio_url;
    } catch (error: any) {
      console.error('User Dashboard: Error fetching audio URL:', error);
      toast.error('Failed to load audio: ' + error.message);
      return null;
    } finally {
      setLoadingAudio(false);
    }
  };

  const stopCurrentAudio = () => {
    if (currentAudio) {
      console.log('User Dashboard: Stopping current audio');
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
      setIsPlaying(false);
    }
  };

  const handlePlayPause = async () => {
    try {
      console.log('User Dashboard: Play/pause clicked, current state:', { isPlaying, hasAudio: !!currentAudio });
      
      // If we're currently playing, just pause
      if (isPlaying && currentAudio) {
        console.log('User Dashboard: Pausing audio');
        currentAudio.pause();
        setIsPlaying(false);
        return;
      }

      // If we have paused audio, resume it
      if (!isPlaying && currentAudio) {
        console.log('User Dashboard: Resuming audio');
        await currentAudio.play();
        setIsPlaying(true);
        return;
      }

      // Otherwise, we need to load and play new audio
      const url = await fetchAudioUrl();
      if (!url) {
        console.log('User Dashboard: No audio URL available');
        return;
      }

      console.log('User Dashboard: Creating new audio element with URL:', url);
      
      // Stop any existing audio first
      stopCurrentAudio();

      const audio = new Audio();
      
      // Set up event listeners before setting src
      audio.addEventListener('loadstart', () => {
        console.log('User Dashboard: Audio load started');
      });
      
      audio.addEventListener('loadeddata', () => {
        console.log('User Dashboard: Audio data loaded');
      });
      
      audio.addEventListener('canplay', () => {
        console.log('User Dashboard: Audio can start playing');
      });
      
      audio.addEventListener('ended', () => {
        console.log('User Dashboard: Audio playback ended');
        setIsPlaying(false);
        setCurrentAudio(null);
      });
      
      audio.addEventListener('error', (e) => {
        console.error('User Dashboard: Audio error:', e);
        console.error('User Dashboard: Audio error details:', audio.error);
        toast.error('Failed to play audio - file may be corrupted or inaccessible');
        setIsPlaying(false);
        setCurrentAudio(null);
      });

      audio.addEventListener('pause', () => {
        console.log('User Dashboard: Audio paused');
        setIsPlaying(false);
      });

      audio.addEventListener('play', () => {
        console.log('User Dashboard: Audio started playing');
        setIsPlaying(true);
      });

      // Set the audio source
      audio.src = url;
      setCurrentAudio(audio);

      console.log('User Dashboard: Attempting to play audio');
      try {
        await audio.play();
        console.log('User Dashboard: Audio play() succeeded');
        setIsPlaying(true);
      } catch (playError) {
        console.error('User Dashboard: Audio play() failed:', playError);
        toast.error('Failed to start audio playback');
        setCurrentAudio(null);
      }
      
    } catch (error: any) {
      console.error('User Dashboard: Error in handlePlayPause:', error);
      toast.error('Failed to play audio: ' + error.message);
      setIsPlaying(false);
      setCurrentAudio(null);
    }
  };

  const handleDownloadAudio = async () => {
    try {
      setDownloadingAudio(true);
      console.log('User Dashboard: Starting download for request:', request.id);

      // Use the same logic as fetchAudioUrl but for download
      const { data: audioData, error: audioError } = await supabase
        .from('custom_song_audio')
        .select('*')
        .eq('request_id', request.id)
        .order('created_at', { ascending: false });

      console.log('User Dashboard: Audio query result for download:', { audioData, audioError, requestId: request.id });

      if (audioError) {
        console.error('User Dashboard: Database error:', audioError);
        toast.error('Failed to fetch audio data: ' + audioError.message);
        return;
      }

      if (!audioData || audioData.length === 0) {
        console.error('User Dashboard: No audio records found for request:', request.id);
        toast.error('No audio files found for this request. Please contact support if this seems incorrect.');
        return;
      }

      console.log('User Dashboard: Found audio records:', audioData);

      // Get the selected audio file or the most recent one
      let audioRecord = audioData.find(record => record.is_selected === true);
      if (!audioRecord) {
        console.log('User Dashboard: No selected audio found, using most recent');
        audioRecord = audioData[0]; // Already sorted by created_at desc
      }

      console.log('User Dashboard: Using audio record for download:', audioRecord);

      if (!audioRecord?.audio_url) {
        console.error('User Dashboard: Audio record missing URL:', audioRecord);
        toast.error('Audio file URL is missing');
        return;
      }

      console.log('User Dashboard: Attempting download from URL:', audioRecord.audio_url);

      // Download the file
      const response = await fetch(audioRecord.audio_url);
      console.log('User Dashboard: Fetch response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log('User Dashboard: Downloaded blob size:', blob.size);

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

      console.log('User Dashboard: Download completed successfully');
      toast.success('Audio file downloaded successfully!');
      
    } catch (error: any) {
      console.error('User Dashboard: Download error:', error);
      toast.error('Failed to download audio file: ' + error.message);
    } finally {
      setDownloadingAudio(false);
    }
  };

  const canManageLyrics = request.status === 'lyrics_proposed';
  const showLyricsButton = ['lyrics_proposed', 'lyrics_selected', 'audio_uploaded', 'completed'].includes(request.status);
  const canDownloadAudio = ['audio_uploaded', 'completed'].includes(request.status);
  const canPlayAudio = ['audio_uploaded', 'completed'].includes(request.status);

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
            <div className="flex justify-center gap-2">
              <Button 
                variant="outline"
                onClick={handlePlayPause}
                disabled={loadingAudio}
                className="flex items-center gap-2"
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-4 w-4" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    {loadingAudio ? "Loading..." : "Play"}
                  </>
                )}
              </Button>
              <Button 
                className="bg-melody-secondary hover:bg-melody-secondary/90"
                onClick={handleDownloadAudio}
                disabled={downloadingAudio}
              >
                <Download className="h-4 w-4 mr-2" />
                {downloadingAudio ? "Downloading..." : "Download Song"}
              </Button>
            </div>
          </div>
        )}
        
        {request.status === 'completed' && (
          <div className="text-center py-6">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <h4 className="font-semibold mb-2">Song Completed!</h4>
            <p className="text-muted-foreground mb-4">
              Your custom song request has been completed. Thank you for using our service!
            </p>
            <div className="flex justify-center gap-2">
              <Button 
                variant="outline"
                onClick={handlePlayPause}
                disabled={loadingAudio}
                className="flex items-center gap-2"
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-4 w-4" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    {loadingAudio ? "Loading..." : "Play"}
                  </>
                )}
              </Button>
              <Button 
                className="bg-melody-secondary hover:bg-melody-secondary/90"
                onClick={handleDownloadAudio}
                disabled={downloadingAudio}
              >
                <Download className="h-4 w-4 mr-2" />
                {downloadingAudio ? "Downloading..." : "Download Song"}
              </Button>
            </div>
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
