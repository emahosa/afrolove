
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Play, Pause, Music, Clock, Zap } from "lucide-react";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { toast } from "sonner";

interface GeneratedSongCardProps {
  song: {
    id: string;
    title: string;
    audio_url?: string;
    status: string;
    created_at: string;
    credits_used: number;
    genre?: string;
    duration?: number;
  };
}

const GeneratedSongCard = ({ song }: GeneratedSongCardProps) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const { currentSong, isPlaying, playPause, stop } = useAudioPlayer();

  const handlePlay = () => {
    if (!song.audio_url) {
      toast.error("Audio not available for this song");
      return;
    }

    if (currentSong?.id === song.id && isPlaying) {
      playPause();
    } else {
      playPause(song);
    }
  };

  const handleDownload = async () => {
    if (!song.audio_url) {
      toast.error("Download not available for this song");
      return;
    }

    setIsDownloading(true);
    
    try {
      console.log('Downloading song:', song.title);
      
      // Fetch the audio file
      const response = await fetch(song.audio_url);
      if (!response.ok) {
        throw new Error('Failed to download audio file');
      }
      
      const blob = await response.blob();
      
      // Create download link with proper filename
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Use song title for filename, clean it up for file system
      const cleanTitle = song.title
        .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove special characters
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .toLowerCase();
      
      const fileExtension = song.audio_url.includes('.wav') ? '.wav' : '.mp3';
      link.download = `${cleanTitle}${fileExtension}`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(url);
      
      toast.success(`Downloaded: ${song.title}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download song');
    } finally {
      setIsDownloading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'processing':
        return 'bg-yellow-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isCurrentlyPlaying = currentSong?.id === song.id && isPlaying;

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate">
              {song.title}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge 
                variant="secondary" 
                className={`${getStatusColor(song.status)} text-white`}
              >
                {song.status}
              </Badge>
              {song.genre && (
                <Badge variant="outline">
                  <Music className="h-3 w-3 mr-1" />
                  {song.genre}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{formatDuration(song.duration)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="h-4 w-4" />
            <span>{song.credits_used} credits</span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Created: {new Date(song.created_at).toLocaleDateString()}
        </div>

        {song.status === 'completed' && song.audio_url && (
          <div className="flex gap-2">
            <Button
              onClick={handlePlay}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              {isCurrentlyPlaying ? (
                <Pause className="h-4 w-4 mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isCurrentlyPlaying ? 'Pause' : 'Play'}
            </Button>
            
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              disabled={isDownloading}
            >
              {isDownloading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isDownloading ? 'Downloading...' : 'Download'}
            </Button>
          </div>
        )}

        {song.status === 'processing' && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-melody-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Generating your song...</p>
          </div>
        )}

        {song.status === 'failed' && (
          <div className="text-center py-4">
            <p className="text-sm text-red-600">
              Song generation failed. Please try again.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GeneratedSongCard;
