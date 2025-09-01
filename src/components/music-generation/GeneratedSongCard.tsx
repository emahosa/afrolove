import React, { useState, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Mic, MoreVertical, Pause, Play, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Song } from '@/hooks/use-songs';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { formatTime } from '@/lib/audio-utils';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface GeneratedSongCardProps {
  song: Song;
  onPlay?: (song: Song) => void;
  onPause?: (song: Song) => void;
  onDownload?: (song: Song) => void;
  onDelete?: (songId: string) => void;
  onSeparateVocals?: (song: Song) => void;
  isPlaying: boolean;
}

const GeneratedSongCard = ({ song, onPlay, onPause, isPlaying, onDownload, onDelete, onSeparateVocals }: GeneratedSongCardProps) => {
  const { setNowPlaying } = useAudioPlayer();
  const [downloading, setDownloading] = useState(false);

  const handlePlayPause = useCallback(() => {
    if (song.audio_url) {
      setNowPlaying(song);
      if (isPlaying) {
        onPause?.(song);
      } else {
        onPlay?.(song);
      }
    } else {
      toast.error("Audio not available");
    }
  }, [song, isPlaying, onPlay, onPause, setNowPlaying]);

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-300 group">
      <CardContent className="p-4">
        <div className="space-y-2">
          <img
            src={song.cover_image_url || "/placeholder.png"}
            alt={song.title}
            className="aspect-square object-cover w-full rounded-md"
          />
          <h3 className="text-lg font-semibold truncate">{song.title}</h3>
          <p className="text-sm text-muted-foreground truncate">{song.artist || 'Unknown Artist'}</p>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePlayPause}
              disabled={!song.audio_url || song.status !== 'completed'}
              className="h-8 w-8 p-0"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span className="sr-only">
                {isPlaying ? 'Pause' : 'Play'}
              </span>
            </Button>

            {song.audio_url && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDownload?.(song)}
                className="h-8 w-8 p-0"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}

            {song.audio_url && song.type !== 'instrumental' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSeparateVocals?.(song)}
                className="h-8 w-8 p-0"
                title="Separate Vocals"
              >
                <Mic className="h-4 w-4" />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onDelete?.(song.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="text-right">
            {song.credits && (
              <p className="text-xs text-muted-foreground">
                Credits: {song.credits}
              </p>
            )}
            {song.duration && (
              <p className="text-xs text-muted-foreground">
                {formatTime(song.duration)}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4">
          {song.status === 'pending' && (
            <div className="text-sm text-muted-foreground">
              <p>Processing...</p>
            </div>
          )}
          {song.status === 'processing' && (
            <div className="text-sm text-muted-foreground">
              <p>Generating audio...</p>
              <Progress value={song.progress || 0} className="mt-1" />
            </div>
          )}
          {song.status === 'completed' && (
            <div className="text-sm text-green-500">
              <p>Ready to play</p>
            </div>
          )}
          {song.status === 'failed' && (
            <div className="text-sm text-red-500">
              <p>Generation failed. Please try again.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GeneratedSongCard;
