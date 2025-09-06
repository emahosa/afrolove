import { useState } from "react";
import { MotionCard, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Play, Pause, Clock, Zap, FileText, Loader2 } from "lucide-react";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Song } from "@/pages/Library";

interface GeneratedSongCardProps {
  song: Song;
}

const GeneratedSongCard = ({ song }: GeneratedSongCardProps) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudioPlayer();

  const handlePlay = () => {
    if (!song.audio_url) {
      toast.error("Audio not available for this song");
      return;
    }
    const track = { id: song.id, title: song.title, audio_url: song.audio_url, artist: 'AI Generated' };
    if (currentTrack?.id === song.id) {
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
      const cleanTitle = song.title.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_').toLowerCase();
      const fileExtension = song.audio_url.includes('.wav') ? '.wav' : '.mp3';
      link.download = `${cleanTitle}${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded: ${song.title}`);
    } catch (error) {
      toast.error('Failed to download song');
    } finally {
      setIsDownloading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (seconds === undefined) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isCurrentlyPlaying = currentTrack?.id === song.id && isPlaying;

  const cardVariants = {
    hover: { y: -5, scale: 1.03, transition: { type: "spring", stiffness: 300, damping: 20 } },
  };

  return (
    <MotionCard
      variants={cardVariants}
      whileHover="hover"
      layout
      className="flex flex-col h-full"
    >
      <CardHeader>
        <CardTitle className="text-lg">{song.title}</CardTitle>
        <div className="flex items-center gap-2 pt-1">
          <Badge variant="secondary">{song.status}</Badge>
          {song.genre && <Badge variant="outline">{song.genre}</Badge>}
        </div>
      </CardHeader>

      <CardContent className="flex-grow flex flex-col justify-between">
        <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-white/70">
                <div className="flex items-center gap-1.5"><Clock size={14} /><span>{formatDuration(song.duration)}</span></div>
                <div className="flex items-center gap-1.5"><Zap size={14} /><span>{song.credits_used} credits</span></div>
            </div>
            <div className="text-xs text-white/70">
                Created: {new Date(song.created_at).toLocaleDateString()}
            </div>
        </div>

        <div className="space-y-2 mt-4">
            {song.lyrics && song.lyrics.trim() !== '[Instrumental]' && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="secondary" size="sm" className="w-full"><FileText size={16} className="mr-2" /> View Lyrics</Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="p-3 bg-black/30 rounded-lg max-h-24 overflow-y-auto text-sm text-white/70 whitespace-pre-wrap font-mono">
                    {song.lyrics}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {(song.status === 'completed' || song.status === 'approved') && song.audio_url ? (
              <div className="flex gap-2">
                <Button onClick={handlePlay} size="sm" className="flex-1">
                  {isCurrentlyPlaying ? <Pause size={16} className="mr-2" /> : <Play size={16} className="mr-2" />}
                  {isCurrentlyPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button onClick={handleDownload} variant="secondary" size="icon" disabled={isDownloading}>
                  {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                </Button>
              </div>
            ) : (
                <div className="text-center py-4 text-sm text-white/70">
                    {song.status === 'processing' ? 'Generating song...' : 'Audio not available'}
                </div>
            )}
        </div>
      </CardContent>
    </MotionCard>
  );
};

export default GeneratedSongCard;
