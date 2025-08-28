import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Play, Pause, Music, Clock, Zap, FileText } from "lucide-react";
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
  const [showLyrics, setShowLyrics] = useState(false);
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
      console.log('Downloading song:', song.title);
      
      // Fetch the audio file
      const response = await fetch(song.audio_url);
      if (!response.ok) {
        throw new Error('Failed to download audio file');
      }
      
      const blob = await response.blob();
      
      // Create download link with proper filename using song title
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
    <Card className="group bg-white/5 border-white/10 text-white backdrop-blur-sm flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-bold truncate text-white">
              {song.title}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge 
                variant="outline"
                className={`text-xs ${getStatusColor(song.status)}`}
              >
                {song.status}
              </Badge>
              {song.genre && (
                <Badge variant="outline" className="border-white/20 text-gray-300">
                  <Music className="h-3 w-3 mr-1" />
                  {song.genre}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-grow flex flex-col">
        <div className="flex-grow space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-400">
                <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(song.duration)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Zap className="h-4 w-4" />
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
              <Button variant="outline" size="sm" className="w-full mt-2 bg-transparent border-white/30 hover:bg-white/10 text-white">
                <FileText className="h-4 w-4 mr-2" />
                Show Lyrics
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="p-3 bg-black/30 rounded-md max-h-32 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-xs font-mono text-gray-300">
                  {song.lyrics}
                </pre>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {song.status === 'completed' || song.status === 'approved' && song.audio_url ? (
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handlePlay}
              size="sm"
              className="flex-1 bg-dark-purple hover:bg-opacity-90 font-bold"
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
              className="bg-transparent border-white/30 hover:bg-white/10"
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
