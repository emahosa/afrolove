import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Play, Pause, Music, Clock, Zap, FileText, Loader2 } from "lucide-react";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
    lyrics?: string;
  };
}

const GeneratedSongCard = ({ song }: GeneratedSongCardProps) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudioPlayer();

  const handlePlay = () => {
    if (!song.audio_url) {
      toast.error("Audio not available for this song");
      return;
    }

    const track = {
      id: song.id,
      title: song.title,
      audio_url: song.audio_url,
      artist: 'AI Generated'
    };

    if (currentTrack?.id === song.id && isPlaying) {
      togglePlayPause();
    } else {
      playTrack(track);
    }
  };

  const handleDownload = async () => {
    if (!song.audio_url) {
      toast.error("Download not available for this song");
      return;
    }

    setIsDownloading(true);
    
    try {
      const response = await fetch(song.audio_url);
      if (!response.ok) throw new Error('Failed to download audio file');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const cleanTitle = song.title.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
      const fileExtension = song.audio_url.includes('.wav') ? '.wav' : '.mp3';
      link.download = `${cleanTitle || 'song'}${fileExtension}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
      case 'approved':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'processing':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'failed':
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isCurrentlyPlaying = currentTrack?.id === song.id && isPlaying;

  return (
    <Card variant="glass" className="flex flex-col h-full">
      <CardHeader className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold truncate">
              {song.title}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge 
                variant="outline"
                className={`text-xs ${getStatusColor(song.status)} px-1.5 py-0.5`}
              >
                {song.status}
              </Badge>
              {song.genre && (
                <Badge variant="glass" className="text-xs">
                  {song.genre}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 space-y-2 flex-grow flex flex-col">
        <div className="flex-grow space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDuration(song.duration)}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    <span>{song.credits_used} credits</span>
                </div>
            </div>

            <div className="text-xs text-gray-500">
                Created: {new Date(song.created_at).toLocaleDateString()}
            </div>
        </div>

        {song.lyrics && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="glass" size="sm" className="w-full mt-2 text-xs">
                <FileText className="h-3 w-3 mr-1" />
                Lyrics
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="p-2 bg-black/30 rounded-md max-h-24 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-xs font-mono text-gray-300">
                  {song.lyrics}
                </pre>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {(song.status === 'completed' || song.status === 'approved') && song.audio_url ? (
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handlePlay}
              variant="glass"
              size="sm"
              className="flex-1 font-semibold text-xs h-8"
            >
              {isCurrentlyPlaying ? (
                <Pause className="h-4 w-4 mr-1" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              {isCurrentlyPlaying ? 'Pause' : 'Play'}
            </Button>
            
            <Button
              onClick={handleDownload}
              variant="glass"
              size="icon"
              disabled={isDownloading}
              className="h-8 w-8"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
          </div>
        ) : (
            <div className="text-center py-4 text-sm text-gray-400">
                {song.status === 'processing' ? 'Generating song...' : 'Audio not available'}
            </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GeneratedSongCard;
