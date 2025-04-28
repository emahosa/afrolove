
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Speaker, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type VoiceClone = {
  id: string;
  name: string;
  status: string;
  created_at: string;
};

const VoiceCloneList = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [voiceClones, setVoiceClones] = useState<VoiceClone[]>([]);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);

  useEffect(() => {
    const fetchVoiceClones = async () => {
      try {
        if (!user?.id) return;
        
        const { data, error } = await supabase
          .from('voice_clones')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setVoiceClones(data || []);
      } catch (error) {
        console.error('Error fetching voice clones:', error);
        toast({
          title: "Failed to load voice profiles",
          description: "Could not load your voice profiles at this time",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchVoiceClones();
  }, [user]);

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

  const handleDeleteProfile = async (cloneId: string) => {
    try {
      const { error } = await supabase
        .from('voice_clones')
        .delete()
        .eq('id', cloneId);
      
      if (error) throw error;
      
      setVoiceClones(voiceClones.filter(clone => clone.id !== cloneId));
      
      toast({
        title: "Voice profile deleted",
        description: "Your voice profile has been removed",
      });
    } catch (error) {
      console.error('Error deleting voice profile:', error);
      toast({
        title: "Failed to delete voice profile",
        description: "Could not delete your voice profile at this time",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (voiceClones.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground">You haven't created any voice profiles yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {voiceClones.map((profile) => (
        <Card key={profile.id} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center">
                <Speaker className="h-4 w-4 mr-2" />
                <div>
                  <p className="font-medium">{profile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Created: {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default VoiceCloneList;
