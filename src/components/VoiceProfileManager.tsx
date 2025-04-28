
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Speaker, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import VoiceCloning from "./VoiceCloning";
import VoiceCloneList from "./library/VoiceCloneList";

const VoiceProfileManager = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
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

  const handleDeleteProfile = async (voiceId: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('voice_clones')
        .delete()
        .eq('id', voiceId);
        
      if (error) throw error;
      
      toast({
        title: "Voice profile deleted",
        description: "Your voice profile has been removed",
      });
    } catch (error) {
      console.error('Error deleting voice profile:', error);
      toast({
        title: "Failed to delete",
        description: "Could not delete the voice profile at this time",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <VoiceCloneList />
        )}
        
        <div className="mt-4">
          <VoiceCloning />
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceProfileManager;
