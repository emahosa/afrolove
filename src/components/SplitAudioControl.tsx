
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Download, MusicIcon, Settings, SplitSquareVertical } from "lucide-react";
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
  const { user } = useAuth();

  const handleSplitAudio = () => {
    if (!songUrl) {
      toast.error("No audio file available to split");
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
                  placeholder="Enter your API key"
                  type="password"
                />
                <p className="text-sm text-muted-foreground">
                  This API key will be used for all audio separation requests.
                </p>
              </div>
              
              <Button 
                className="w-full mt-4" 
                onClick={() => {
                  if (!apiKey.trim()) {
                    toast.error("Please enter a valid API key");
                    return;
                  }
                  
                  toast.success("Audio separation API key has been saved");
                }}
              >
                Save Settings
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <div className="flex flex-col gap-2">
          {!splitComplete ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSplitAudio}
              disabled={isSplitting}
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
