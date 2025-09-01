
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Download, Heart, Share2 } from 'lucide-react';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { Badge } from '@/components/ui/badge';

export interface GeneratedSongCardProps {
  song: {
    id: string;
    title: string;
    audio_url: string;
    status: 'pending' | 'completed' | 'failed';
    created_at: string;
    prompt: string;
    credits_used: number;
    duration: number;
  };
  isPlaying?: boolean;
}

const formatDuration = (seconds: number): string => {
  if (!seconds || seconds === 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const GeneratedSongCard: React.FC<GeneratedSongCardProps> = ({ song, isPlaying = false }) => {
  const { currentTrack, isPlaying: playerIsPlaying, playTrack, pauseTrack } = useAudioPlayer();
  const [isLiked, setIsLiked] = useState(false);
  
  const isCurrentlyPlaying = currentTrack?.id === song.id && playerIsPlaying;

  const handlePlayPause = () => {
    if (isCurrentlyPlaying) {
      pauseTrack();
    } else {
      playTrack({
        id: song.id,
        title: song.title,
        artist: 'AI Generated',
        audio_url: song.audio_url,
        artwork_url: undefined
      });
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = song.audio_url;
    link.download = `${song.title}.mp3`;
    link.click();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: song.title,
          text: `Check out this AI-generated song: ${song.title}`,
          url: song.audio_url,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(song.audio_url);
    }
  };

  return (
    <Card className="w-full max-w-sm bg-card hover:bg-accent/50 transition-colors">
      <CardContent className="p-4">
        <div className="aspect-square bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg mb-4 flex items-center justify-center">
          <div className="text-4xl">🎵</div>
        </div>
        
        <div className="space-y-2">
          <h3 className="font-semibold text-lg truncate">{song.title}</h3>
          
          <div className="flex items-center gap-2">
            <Badge variant={song.status === 'completed' ? 'default' : 'secondary'}>
              {song.status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {formatDuration(song.duration)}
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2">
            {song.prompt}
          </p>
          
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlayPause}
                disabled={song.status !== 'completed'}
              >
                {isCurrentlyPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsLiked(!isLiked)}
              >
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                disabled={song.status !== 'completed'}
              >
                <Download className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                disabled={song.status !== 'completed'}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground pt-1">
            Credits used: {song.credits_used} • {new Date(song.created_at).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GeneratedSongCard;
