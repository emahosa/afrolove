import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Download, 
  Share2, 
  Heart, 
  MoreHorizontal,
  Music,
  Clock,
  User,
  Calendar,
  Trash
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useAudioPlayer } from '@/hooks/use-audio-player';

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
  isPlaying?: boolean;
}

const GeneratedSongCard = ({ song, isPlaying }: GeneratedSongCardProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const { handlePlay } = useAudioPlayer();

  console.log('🎵 GeneratedSongCard: Rendering song card:', song.title, 'Status:', song.status, 'URL:', song.audio_url);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Processing</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-800">Approved</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleDownload = () => {
    console.log('⬇️ Download requested for:', song.title, 'URL:', song.audio_url);
    
    if (song.status === 'completed' && song.audio_url && song.audio_url.startsWith('http')) {
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

  const handleShare = () => {
    console.log('📤 Share requested for:', song.title);
    
    if (song.status === 'completed' && song.audio_url && song.audio_url.startsWith('http')) {
      if (navigator.share) {
        navigator.share({
          title: song.title,
          text: `Check out this AI-generated song: ${song.title}`,
          url: song.audio_url,
        });
        console.log('✅ Native share triggered');
      } else {
        navigator.clipboard.writeText(song.audio_url);
        toast.success('Song link copied to clipboard!');
        console.log('✅ Link copied to clipboard');
      }
    } else {
      console.log('❌ Share not available - song not ready');
      toast.error('Song is not ready for sharing yet');
    }
  };

  const handlePlayClick = () => {
    console.log('🎵 GeneratedSongCard: Play button clicked for Suno song:', song.title, 'ID:', song.id, 'Status:', song.status);
    
    if (isPlayable) {
      console.log('🎵 GeneratedSongCard: Song is playable, calling handlePlay');
      // Pass the song with type 'suno' to distinguish it from custom songs
      handlePlay({
        id: song.id,
        title: song.title,
        type: 'suno'
      });
      console.log('🎵 GeneratedSongCard: handlePlay called successfully');
    } else {
      console.log('❌ GeneratedSongCard: Song not playable:', song.status, song.audio_url);
      
      if (song.status === 'pending') {
        toast.error('Song is still being generated. Please wait...');
      } else if (song.status === 'rejected') {
        toast.error('Song generation failed. Cannot play this song.');
      } else {
        toast.error('Song is not ready for playback yet');
      }
    }
  };

  const handleDelete = () => {
    console.log('🗑️ Delete requested for:', song.title);
    toast.info('Delete feature coming soon!');
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

  // A song is playable if it's completed and has a valid HTTP URL
  const isPlayable = song.status === 'completed' && song.audio_url && song.audio_url.startsWith('http');
  console.log('🎮 GeneratedSongCard: Song playable?', isPlayable, 'Status:', song.status, 'Valid URL:', song.audio_url && song.audio_url.startsWith('http'));

  return (
    <Card className="group hover:shadow-lg transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold line-clamp-1">
              {song.title}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(song.status)}
              {song.duration && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDuration(song.duration)}
                </div>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toast.info('Add to playlist feature coming soon!')}>
                Add to Playlist
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info('Remix feature coming soon!')}>
                Create Remix
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info('Vocal separation coming soon!')}>
                Extract Vocals
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Waveform placeholder */}
        <div className="h-20 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
          <div className="flex items-center gap-1">
            {Array.from({ length: 40 }, (_, i) => (
              <div
                key={i}
                className="w-1 bg-purple-400 rounded-full"
                style={{
                  height: `${Math.random() * 50 + 10}px`,
                  opacity: isPlaying ? Math.random() * 0.8 + 0.2 : 0.6,
                }}
              />
            ))}
          </div>
        </div>

        {/* Song metadata */}
        {song.prompt && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {song.prompt}
          </p>
        )}

        {/* Primary Action buttons - Always visible */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                console.log('🎵 GeneratedSongCard: Play button clicked - direct onClick');
                handlePlayClick();
              }}
              disabled={!isPlayable}
              className="flex items-center gap-2"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isPlaying ? 'Pause' : 'Play'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={!isPlayable}
              title="Download song"
            >
              <Download className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              disabled={!isPlayable}
              title="Share song"
            >
              <Share2 className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              title="Delete song"
              className="text-red-600 hover:text-red-700"
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsLiked(!isLiked);
              console.log('❤️ Like toggled for:', song.title, 'New state:', !isLiked);
            }}
            className={isLiked ? 'text-red-500' : ''}
            title="Like song"
          >
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
          </Button>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
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
