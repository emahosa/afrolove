
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Disc, Download, MoreHorizontal, Music, Pause, Play, Share2 } from "lucide-react";
import { VocalSeparationButton } from "@/components/VocalSeparationButton";
import VoiceCloning from "@/components/VoiceCloning";
import VoiceChanger from "@/components/VoiceChanger";
import { toast } from "sonner";

interface Track {
  id: string;
  title: string;
  type: "song" | "instrumental";
  genre: string;
  date: string;
  audioUrl?: string;
  task_id?: string;
  audio_id?: string;
  instrumental_url?: string;
  vocal_url?: string;
  vocal_separation_status?: string;
}

interface SingleTrackViewProps {
  track: Track;
  onBackClick: () => void;
  playingTrack: string | null;
  onPlayToggle: (trackId: string, trackTitle: string, audioUrl?: string) => void; // Added audioUrl here too
  onVoiceCloned: (voiceId: string) => void;
  selectedVoiceId: string | null;
}

const SingleTrackView = ({
  track,
  onBackClick,
  playingTrack,
  onPlayToggle,
  onVoiceCloned,
  selectedVoiceId,
}: SingleTrackViewProps) => {
  const handleDownload = (trackTitle: string, audioUrl?: string) => {
    if (!audioUrl) {
      toast.error("Download failed: Audio source not found.");
      console.error("Download error: track.audioUrl is missing for track:", track.id);
      return;
    }

    try {
      toast.info("Preparing your download..."); // More accurate initial toast

      const fileName = `${trackTitle.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_') || 'download'}.mp3`;

      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Downloading "${fileName}"...`);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Download failed. Please try again.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Button 
        variant="ghost" 
        className="mb-4" 
        onClick={onBackClick}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Library
      </Button>
      
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-melody-primary/30 flex items-center justify-center rounded-md">
                {track.type === "song" ? (
                  <Music className="h-8 w-8 text-melody-secondary/70" />
                ) : (
                  <Disc className="h-8 w-8 text-melody-secondary/70" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{track.title}</h2>
                <p className="text-muted-foreground">{track.genre} • {track.type}</p>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => onPlayToggle(track.id, track.title)}
                >
                  {playingTrack === track.id ? (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      <span>Stop</span>
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      <span>Play</span>
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload(track.title)}>
                  <Download className="mr-2 h-4 w-4" />
                  <span>Download</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 className="mr-2 h-4 w-4" />
                  <span>Share</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="audio-wave h-24 mb-6">
            <div className="audio-wave-bar h-16"></div>
            <div className="audio-wave-bar h-24"></div>
            <div className="audio-wave-bar h-12"></div>
            <div className="audio-wave-bar h-20"></div>
            <div className="audio-wave-bar h-8"></div>
            <div className="audio-wave-bar h-22"></div>
          </div>

          <div className="space-y-4">
            {track.task_id && track.audio_id && (
              <VocalSeparationButton
                songId={track.id}
                taskId={track.task_id}
                audioId={track.audio_id}
                songTitle={track.title}
                instrumentalUrl={track.instrumental_url}
                vocalUrl={track.vocal_url}
                originalUrl={track.audioUrl}
                vocalSeparationStatus={track.vocal_separation_status}
              />
            )}
            <div className="flex items-center gap-2">
              <VoiceCloning onVoiceCloned={onVoiceCloned} />
              {selectedVoiceId && (
                <VoiceChanger 
                  songName={track.title} 
                  songUrl="mock-url"
                  voiceId={selectedVoiceId}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SingleTrackView;
