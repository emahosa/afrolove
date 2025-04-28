
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Disc, Download, MoreHorizontal, Music, Pause, Play, Share2 } from "lucide-react";
import SplitAudioControl from "@/components/SplitAudioControl";
import VoiceCloning from "@/components/VoiceCloning";
import VoiceChanger from "@/components/VoiceChanger";
import { toast } from "@/hooks/use-toast";

interface Track {
  id: string;
  title: string;
  type: "song" | "instrumental";
  genre: string;
  date: string;
}

interface SingleTrackViewProps {
  track: Track;
  onBackClick: () => void;
  playingTrack: string | null;
  onPlayToggle: (trackId: string, trackTitle: string) => void;
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
  const handleDownload = (trackTitle: string) => {
    toast({
      title: "Download started",
      description: "Your song is being downloaded",
    });
    
    setTimeout(() => {
      toast({
        title: "Download complete",
        description: `${trackTitle}.mp3 has been saved to your downloads folder`,
      });
    }, 2000);
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
            <SplitAudioControl songName={track.title} songUrl="mock-url" />
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
