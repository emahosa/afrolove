
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Music, Clock, Calendar, AlertCircle, FileText, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';

interface Song {
  id: string;
  title: string;
  audio_url: string;
  status: 'pending' | 'completed' | 'rejected' | 'approved';
  created_at: string;
  prompt?: string;
  credits_used: number;
  duration?: number;
}

interface GeneratedSongCardProps {
  song: Song;
}

const GeneratedSongCard = ({ song }: GeneratedSongCardProps) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();

  // More lenient check for playable songs - any completed song with an audio URL
  const isPlayable = (song.status === 'completed' || song.status === 'approved') && 
                    !!song.audio_url && 
                    song.audio_url.trim() !== '';
  
  const isCurrentlyPlayingThisTrack = isPlaying && currentTrack?.id === song.id;

  console.log('🎵 GeneratedSongCard render:', {
    id: song.id,
    title: song.title,
    status: song.status,
    audio_url: song.audio_url,
    isPlayable,
    isCurrentlyPlayingThisTrack
  });

  const getStatusContent = () => {
    switch (song.status) {
      case 'completed':
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'pending':
        return <Badge className="animate-pulse"><Loader2 className="h-3 w-3 mr-1 inline-block animate-spin"/>Generating</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1 inline-block"/>Failed</Badge>;
      default:
        return <Badge variant="secondary">{song.status}</Badge>;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const handleDownload = () => {
    console.log('⬇️ Download requested for:', song.title, 'URL:', song.audio_url);
    
    if (isPlayable) {
      const link = document.createElement('a');
      link.href = song.audio_url;
      link.download = `${song.title}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download started!');
      console.log('✅ Download initiated for:', song.title);
    } else {
      console.log('❌ Download not available - song not ready or invalid URL:', song.audio_url);
      toast.error('Song is not ready for download yet');
    }
  };

  const handlePlay = () => {
    console.log('🎵 Play button clicked for:', song.title, 'Playable:', isPlayable);
    
    if (!isPlayable) {
      console.log('❌ Song not playable:', {
        status: song.status,
        audio_url: song.audio_url,
        url_valid: !!song.audio_url && song.audio_url.trim() !== ''
      });
      toast.error('Song is not ready for playback yet.');
      return;
    }
    
    console.log('✅ Calling playTrack with:', {
      id: song.id,
      title: song.title,
      audio_url: song.audio_url
    });
    
    try {
      playTrack({
        id: song.id,
        title: song.title,
        audio_url: song.audio_url,
        artist: 'AI Generated',
      });
      console.log('✅ playTrack call completed');
    } catch (error) {
      console.error('❌ Error calling playTrack:', error);
      toast.error('Failed to start playback');
    }
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold line-clamp-1">
              {song.title}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              {getStatusContent()}
              {song.duration && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDuration(song.duration)}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-grow flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handlePlay}
              disabled={!isPlayable}
              title={isCurrentlyPlayingThisTrack ? "Pause song" : "Play song"}
              className="flex-grow"
            >
              {isCurrentlyPlayingThisTrack ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              {isCurrentlyPlayingThisTrack ? 'Pause' : 'Play'}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleDownload}
              disabled={!isPlayable}
              title="Download song"
            >
              <Download className="h-4 w-4" />
            </Button>
            
            {song.prompt && (
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setShowPrompt(!showPrompt)}
                title={showPrompt ? "Hide Prompt" : "Show Prompt"}
              >
                <FileText className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {showPrompt && song.prompt && (
            <div className="mt-4 p-3 bg-muted/50 rounded-md border text-sm max-h-48 overflow-y-auto whitespace-pre-wrap">
              <p className="font-semibold mb-2 text-primary">Prompt:</p>
              {song.prompt}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2 mt-4">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(song.created_at)}
          </div>
          <div className="flex items-center gap-1">
            <Music className="h-3 w-3" />
            {song.credits_used} credits
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GeneratedSongCard;
