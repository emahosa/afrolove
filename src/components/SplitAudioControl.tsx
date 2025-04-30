
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Download, Settings, SplitSquareVertical, AlertTriangle } from "lucide-react";
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
  const { user } = useAuth();

  // Check if API key is configured in the system
  useEffect(() => {
    // This would normally check against stored API keys in a real application
    const checkApiKeyStatus = async () => {
      // Simulate checking if Lalal.ai API key exists and is valid
      setTimeout(() => {
        // For demo purposes, let's assume we found an active API key
        const hasActiveKey = true;
        setApiKeyVerified(hasActiveKey);
      }, 500);
    };
    
    checkApiKeyStatus();
  }, []);

  const handleSplitAudio = () => {
    if (!songUrl) {
      toast.error("No audio file available to split");
      return;
    }

    if (apiKeyVerified === false) {
      toast.error("No valid API key configured for audio splitting. Please contact an administrator.");
      return;
    }

    setIsSplitting(true);
    
    // Simulate splitting process
    setTimeout(() => {
      setIsSplitting(false);
      setSplitComplete(true);
      
      toast.success("Vocals and instrumental have been successfully separated");
    }, 3000);
  };

  const handleDownloadZip = () => {
    toast("Your vocals and instrumental files are being downloaded");
    
    // Simulated download
    setTimeout(() => {
      toast.success(`${songName}-split.zip has been saved to your downloads folder`);
    }, 2000);
  };

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      toast.error("Please enter a valid API key");
      return;
    }
    
    // Simple validation - in a real app we would verify this with the actual API
    if (apiKey.includes("-") && apiKey.length > 15) {
      toast.success("Lalal.ai API key has been saved and verified");
      setApiKeyVerified(true);
    } else {
      toast.error("Invalid API key format. Please check and try again.");
      setApiKeyVerified(false);
    }
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
                <Label htmlFor="api-key">Lalal.ai API Key</Label>
                <Input
                  id="api-key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Lalal.ai API key"
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
              No valid API key configured for audio splitting
            </div>
          )}
          
          {!splitComplete ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSplitAudio}
              disabled={isSplitting || apiKeyVerified === false}
              className="flex items-center"
            >
              {isSplitting ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  Splitting...
                </>
              ) : (
                <>
                  <SplitSquareVertical className="h-4 w-4 mr-2" />
                  Split Vocals & Instrumental
                </>
              )}
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownloadZip}
              className="flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Split Files (.zip)
            </Button>
          )}
        </div>
      )}
    </>
  );
};

export default SplitAudioControl;
