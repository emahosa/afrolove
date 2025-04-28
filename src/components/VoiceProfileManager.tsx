
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Speaker, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import VoiceCloning from "./VoiceCloning";

const VoiceProfileManager = () => {
  const { user } = useAuth();
  const [isPlaying, setIsPlaying] = useState<string | null>(null);

  const handlePlaySample = (voiceId: string) => {
    setIsPlaying(voiceId);
    
    // Simulate playing a sample
    setTimeout(() => {
      setIsPlaying(null);
      toast({
        title: "Sample played",
        description: "Voice sample playback complete",
      });
    }, 3000);
  };

  const handleDeleteProfile = (voiceId: string) => {
    // This would connect to the API to delete the voice profile
    toast({
      title: "Voice profile deleted",
      description: "Your voice profile has been removed",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Voice Profiles</CardTitle>
        <CardDescription>
          Manage your voice profiles for use in voice changing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {user?.voiceProfiles && user.voiceProfiles.length > 0 ? (
          <div className="space-y-3">
            {user.voiceProfiles.map((profile) => (
              <div key={profile.id} className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center">
                  <Speaker className="h-4 w-4 mr-2" />
                  <span>{profile.name}</span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => handlePlaySample(profile.id)}
                    disabled={isPlaying === profile.id}
                  >
                    {isPlaying === profile.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Play Sample"
                    )}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-red-500 hover:text-red-700"
                    onClick={() => handleDeleteProfile(profile.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">You haven't created any voice profiles yet</p>
            <VoiceCloning />
          </div>
        )}
        
        {user?.voiceProfiles && user.voiceProfiles.length > 0 && (
          <div className="mt-4">
            <VoiceCloning />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceProfileManager;
