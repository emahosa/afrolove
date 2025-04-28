
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Music, Loader2, Speaker } from "lucide-react";
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
      toast({
        title: "Error",
        description: "No audio file available to process",
        variant: "destructive",
      });
      return;
    }

    if (!voiceId && (!user?.voiceProfiles || user.voiceProfiles.length === 0)) {
      toast({
        title: "No voice profile",
        description: "Please clone your voice first",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    // Simulate voice changing process
    const progressInterval = simulateProgress();
    
    // Simulate the steps in the voice changing process
    setTimeout(() => {
      toast({
        title: "Processing",
        description: "Splitting vocals and instrumentals...",
      });
    }, 1000);
    
    setTimeout(() => {
      toast({
        title: "Processing",
        description: "Applying voice clone to vocals...",
      });
    }, 3000);
    
    setTimeout(() => {
      toast({
        title: "Processing",
        description: "Remastering final track...",
      });
    }, 5000);
    
    setTimeout(() => {
      clearInterval(progressInterval);
      setProgress(100);
      setIsProcessing(false);
      setIsComplete(true);
      
      toast({
        title: "Voice changing complete!",
        description: `"${songName}" has been recreated with your voice`,
      });
      
      if (onComplete) {
        onComplete();
      }
    }, 7000);
  };

  const handleDownload = () => {
    toast({
      title: "Download started",
      description: "Your voice-changed song is being downloaded",
    });
    
    // Simulate download
    setTimeout(() => {
      toast({
        title: "Download complete",
        description: `${songName}-voice-changed.mp3 has been saved to your downloads folder`,
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
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleDownload}
          className="flex items-center"
        >
          <Music className="h-4 w-4 mr-2" />
          Download Voice-Changed Song
        </Button>
      )}
    </div>
  );
};

export default VoiceChanger;
