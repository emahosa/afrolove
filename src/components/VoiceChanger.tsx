
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Music, Loader2, Speaker, Play, Pause } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";

interface VoiceChangerProps {
  songName: string;
  songUrl?: string;
  voiceId?: string;
  onComplete?: () => void;
}

const VoiceChanger = ({ songName, songUrl, voiceId, onComplete }: VoiceChangerProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const { user } = useAuth();

  const simulateProgress = () => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 8;
      if (currentProgress > 100) {
        currentProgress = 100;
        clearInterval(interval);
      }
      setProgress(currentProgress);
    }, 500);
    
    return interval;
  };

  const handleVoiceChange = () => {
    if (!songUrl) {
      toast.error("No audio file available to process");
      return;
    }

    if (!voiceId && !user?.id) {
      toast.error("No voice profile available. Please clone your voice first");
      return;
    }

    setIsProcessing(true);
    
    const progressInterval = simulateProgress();
    
    setTimeout(() => {
      toast("Processing", {
        description: "Splitting vocals and instrumentals..."
      });
    }, 1000);
    
    setTimeout(() => {
      toast("Processing", {
        description: "Applying voice clone to vocals..."
      });
    }, 3000);
    
    setTimeout(() => {
      toast("Processing", {
        description: "Remastering final track..."
      });
    }, 5000);
    
    setTimeout(() => {
      clearInterval(progressInterval);
      setProgress(100);
      setIsProcessing(false);
      setIsComplete(true);
      
      toast.success("Voice changing complete!", {
        description: `"${songName}" has been recreated with your voice`
      });
      
      if (onComplete) {
        onComplete();
      }
    }, 7000);
  };

  const handleListen = () => {
    setIsPlaying(!isPlaying);
    
    if (!isPlaying) {
      toast("Playing remastered version", {
        description: `Now playing: ${songName} with your voice`
      });
      
      setTimeout(() => {
        setIsPlaying(false);
        toast("Playback complete", {
          description: "The remastered song preview has ended"
        });
      }, 30000);
    } else {
      toast("Playback stopped", {
        description: "Remastered song preview stopped"
      });
    }
  };

  const handleDownload = () => {
    toast("Download started", {
      description: "Your voice-changed song is being downloaded"
    });
    
    setTimeout(() => {
      toast.success("Download complete", {
        description: `${songName}-voice-changed.mp3 has been saved to your downloads folder`
      });
    }, 2000);
  };

  return (
    <div className="space-y-4">
      {!isProcessing && !isComplete ? (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleVoiceChange}
          className="flex items-center"
        >
          <Speaker className="h-4 w-4 mr-2" />
          Change Song Voice
        </Button>
      ) : isProcessing ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Changing voice...</span>
            <span className="text-sm font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleListen}
            className="flex items-center"
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Listen
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownload}
            className="flex items-center"
          >
            <Music className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      )}
    </div>
  );
};

export default VoiceChanger;
