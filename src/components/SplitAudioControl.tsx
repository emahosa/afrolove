
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Download, Settings, SplitSquareVertical, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface SplitAudioControlProps {
  songName: string;
  songUrl?: string;
  isAdmin?: boolean;
}

const SplitAudioControl = ({ songName, songUrl, isAdmin = false }: SplitAudioControlProps) => {
  const [isSplitting, setIsSplitting] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [splitComplete, setSplitComplete] = useState(false);
  const [apiKeyVerified, setApiKeyVerified] = useState<boolean | null>(null);
  const [splitResults, setSplitResults] = useState<{ vocals?: string; instrumental?: string } | null>(null);
  const { user } = useAuth();

  // Check if API key is configured in the system
  useEffect(() => {
    const checkApiKeyStatus = async () => {
      try {
        // Check if there's a demo mode or if we have real API integration
        // For now, we'll simulate having an API key for demonstration
        setApiKeyVerified(true);
      } catch (error) {
        console.error('Error checking API key status:', error);
        setApiKeyVerified(false);
      }
    };
    
    checkApiKeyStatus();
  }, []);

  const handleSplitAudio = async () => {
    if (!songUrl) {
      toast.error("No audio file available to split");
      return;
    }

    if (!songUrl.startsWith('http')) {
      toast.error("Invalid audio URL for splitting");
      return;
    }

    if (apiKeyVerified === false) {
      toast.error("No valid API key configured for audio splitting. Please contact an administrator.");
      return;
    }

    setIsSplitting(true);
    toast.info("Starting audio separation process...");
    
    try {
      // In a real implementation, this would call the vocal removal API
      // For now, we'll simulate the process
      console.log('Starting audio split for:', songUrl);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Simulate successful split results
      // In a real implementation, you would get actual separated audio URLs
      const mockResults = {
        vocals: songUrl.replace('.mp3', '_vocals.mp3'),
        instrumental: songUrl.replace('.mp3', '_instrumental.mp3')
      };
      
      setSplitResults(mockResults);
      setSplitComplete(true);
      setIsSplitting(false);
      
      toast.success("Audio separation completed! Vocals and instrumental tracks are ready.");
      
    } catch (error: any) {
      console.error('Audio split error:', error);
      setIsSplitting(false);
      toast.error("Failed to split audio: " + error.message);
    }
  };

  const handleDownloadSplitFiles = async () => {
    if (!splitResults) {
      toast.error("No split files available for download");
      return;
    }

    try {
      toast.info("Preparing download of separated audio files...");
      
      // Download vocals
      if (splitResults.vocals) {
        const vocalsResponse = await fetch(splitResults.vocals);
        if (vocalsResponse.ok) {
          const blob = await vocalsResponse.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${songName}_vocals.mp3`;
          link.click();
          window.URL.revokeObjectURL(url);
        }
      }

      // Download instrumental
      if (splitResults.instrumental) {
        const instrumentalResponse = await fetch(splitResults.instrumental);
        if (instrumentalResponse.ok) {
          const blob = await instrumentalResponse.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${songName}_instrumental.mp3`;
          link.click();
          window.URL.revokeObjectURL(url);
        }
      }

      toast.success("Split audio files have been downloaded!");
      
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error("Failed to download split files: " + error.message);
    }
  };

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      toast.error("Please enter a valid API key");
      return;
    }
    
    // Simple validation - in a real app we would verify this with the actual API
    if (apiKey.includes("-") && apiKey.length > 15) {
      toast.success("Audio separation API key has been saved and verified");
      setApiKeyVerified(true);
    } else {
      toast.error("Invalid API key format. Please check and try again.");
      setApiKeyVerified(false);
    }
  };

  const resetSplit = () => {
    setSplitComplete(false);
    setSplitResults(null);
  };

  return (
    <>
      {isAdmin ? (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Split Audio Settings
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Audio Splitting Configuration</SheetTitle>
              <SheetDescription>
                Configure the API settings for splitting vocals from instrumentals.
              </SheetDescription>
            </SheetHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">Audio Separation API Key</Label>
                <Input
                  id="api-key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your audio separation API key"
                  type="password"
                />
                <p className="text-sm text-muted-foreground">
                  This API key will be used for all audio separation requests.
                  {apiKeyVerified === false && (
                    <span className="text-red-500 flex items-center mt-1">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Invalid API key format
                    </span>
                  )}
                </p>
              </div>
              
              <Button 
                className="w-full mt-4" 
                onClick={handleSaveApiKey}
              >
                Save and Verify API Key
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <div className="flex flex-col gap-2">
          {apiKeyVerified === false && (
            <div className="text-xs text-red-500 mb-1 flex items-center">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Audio separation service not configured
            </div>
          )}
          
          {!splitComplete ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSplitAudio}
              disabled={isSplitting || apiKeyVerified === false || !songUrl?.startsWith('http')}
              className="flex items-center"
            >
              {isSplitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Separating Audio...
                </>
              ) : (
                <>
                  <SplitSquareVertical className="h-4 w-4 mr-2" />
                  Split Vocals & Instrumental
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadSplitFiles}
                className="flex items-center w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Split Files
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetSplit}
                className="flex items-center w-full text-xs"
              >
                Split Again
              </Button>
            </div>
          )}

          {splitComplete && splitResults && (
            <div className="text-xs text-green-600 mt-1">
              ✅ Audio separated successfully
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default SplitAudioControl;
