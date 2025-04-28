
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Mic, MusicIcon, Upload, Loader2, Speaker } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";

interface VoiceCloningProps {
  onVoiceCloned?: (voiceId: string) => void;
  isAdmin?: boolean;
}

const VoiceCloning = ({ onVoiceCloned, isAdmin = false }: VoiceCloningProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [apiKey, setApiKey] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { user, updateUserCredits, updateUserVoiceProfile } = useAuth();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 10MB for demo)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an audio file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    // Check if audio file
    if (!file.type.startsWith("audio/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an audio file",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);
  };

  const simulateProgress = () => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 10;
      if (currentProgress > 100) {
        currentProgress = 100;
        clearInterval(interval);
      }
      setProgress(currentProgress);
    }, 300);
    
    return interval;
  };

  const handleCloneVoice = async () => {
    if (!uploadedFile) {
      toast({
        title: "No file selected",
        description: "Please upload a voice sample first",
        variant: "destructive",
      });
      return;
    }

    if ((user?.credits || 0) < 300) {
      toast({
        title: "Insufficient credits",
        description: "You need 300 credits to clone a voice",
        variant: "destructive",
      });
      return;
    }

    setIsCloning(true);
    
    // Simulate API call to ElevenLabs
    const progressInterval = simulateProgress();
    
    setTimeout(() => {
      clearInterval(progressInterval);
      setProgress(100);
      
      // Generate a mock voice ID
      const mockVoiceId = `voice-${Math.random().toString(36).substring(2, 10)}`;
      setVoiceId(mockVoiceId);
      
      // Update user's credits and save the voice profile
      updateUserCredits(-300);
      updateUserVoiceProfile(mockVoiceId, uploadedFile.name);
      
      toast({
        title: "Voice cloned successfully",
        description: "Your voice has been cloned and added to your profile",
      });
      
      if (onVoiceCloned) {
        onVoiceCloned(mockVoiceId);
      }
      
      setIsCloning(false);
    }, 5000);
  };

  const handleAPIKeySave = () => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter a valid ElevenLabs API key",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "API Key Saved",
      description: "ElevenLabs API key has been saved successfully",
    });
  };

  const handleTriggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      {isAdmin ? (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <Speaker className="h-4 w-4 mr-2" />
              Voice Cloning Settings
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Voice Cloning Configuration</SheetTitle>
              <SheetDescription>
                Configure the ElevenLabs API settings for voice cloning functionality.
              </SheetDescription>
            </SheetHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">ElevenLabs API Key</Label>
                <Input
                  id="api-key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your ElevenLabs API key"
                  type="password"
                />
                <p className="text-sm text-muted-foreground">
                  This API key will be used for all voice cloning and voice changing operations.
                </p>
              </div>
              
              <Button 
                className="w-full mt-4" 
                onClick={handleAPIKeySave}
              >
                Save API Key
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Sheet>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center"
            >
              <Mic className="h-4 w-4 mr-2" />
              Clone/Change Voice
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Voice Cloning</SheetTitle>
              <SheetDescription>
                Upload a 2-minute voice sample to clone your voice. This will cost 300 credits.
              </SheetDescription>
            </SheetHeader>
            
            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
                  <div className="flex items-center">
                    <Mic className="h-5 w-5 text-amber-500 mr-2" />
                    <h3 className="text-sm font-medium text-amber-800">Voice Cloning</h3>
                  </div>
                  <p className="text-sm text-amber-700 mt-2">
                    This feature costs 300 credits. Your voice profile will be saved for future use.
                    Upload a clear 2-minute recording of your voice for best results.
                  </p>
                </div>
                
                {user?.voiceProfiles && user.voiceProfiles.length > 0 ? (
                  <div className="space-y-3">
                    <h3 className="text-base font-medium">Your Voice Profiles</h3>
                    <div className="grid gap-2">
                      {user.voiceProfiles.map((profile) => (
                        <div key={profile.id} className="flex items-center justify-between p-3 border rounded-md">
                          <div className="flex items-center">
                            <Speaker className="h-4 w-4 mr-2" />
                            <span>{profile.name}</span>
                          </div>
                          <Button size="sm" variant="ghost">Use</Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                
                <div className="mt-4">
                  <Label htmlFor="voice-sample">Upload Voice Sample</Label>
                  <Input
                    ref={fileInputRef}
                    id="voice-sample"
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  
                  <div 
                    onClick={handleTriggerFileInput}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 mt-2 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
                  >
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">
                      {uploadedFile ? uploadedFile.name : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Audio file up to 10MB (2 minutes maximum)
                    </p>
                  </div>
                </div>
                
                {uploadedFile && !isCloning && !voiceId && (
                  <div className="mt-4">
                    <audio ref={audioRef} src={URL.createObjectURL(uploadedFile)} controls className="w-full" />
                  </div>
                )}
                
                {isCloning && (
                  <div className="space-y-2 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Cloning voice...</span>
                      <span className="text-sm font-medium">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}
                
                {voiceId && (
                  <div className="rounded-md bg-green-50 p-4 border border-green-200 mt-4">
                    <div className="flex items-center">
                      <Speaker className="h-5 w-5 text-green-500 mr-2" />
                      <h3 className="text-sm font-medium text-green-800">Voice Cloned Successfully!</h3>
                    </div>
                    <p className="text-sm text-green-700 mt-2">
                      Your voice has been cloned and added to your profile. You can now use it to change the vocals in your songs.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col gap-3 mt-4">
              <Button
                onClick={handleCloneVoice}
                disabled={isCloning || !uploadedFile || voiceId !== null}
                className="w-full"
              >
                {isCloning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cloning Voice...
                  </>
                ) : (
                  "Clone Voice (300 Credits)"
                )}
              </Button>
              
              {voiceId && onVoiceCloned && (
                <Button 
                  variant="outline" 
                  onClick={() => onVoiceCloned(voiceId)}
                  className="w-full"
                >
                  Use This Voice
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
};

export default VoiceCloning;
