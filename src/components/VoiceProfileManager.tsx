
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Speaker, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import VoiceCloning from "./VoiceCloning";
import VoiceCloneList from "./library/VoiceCloneList";

const VoiceProfileManager = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [voiceProfiles, setVoiceProfiles] = useState<any[]>([]);

  useEffect(() => {
    // Fetch voice profiles when component mounts
    fetchVoiceProfiles();
  }, [user]);

  const fetchVoiceProfiles = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Simulate fetching data if using supabase directly causes issues
      // In a real app, you'd use supabase.from('voice_clones').select().eq('user_id', user.id)
      setTimeout(() => {
        // Mock data to prevent blank screen
        setVoiceProfiles([
          { id: 'voice-1', name: 'My Voice 1', created_at: '2025-04-01' },
          { id: 'voice-2', name: 'My Voice 2', created_at: '2025-04-15' }
        ]);
        setLoading(false);
      }, 500);
      
    } catch (error) {
      console.error('Error fetching voice profiles:', error);
      toast.error("Could not retrieve your voice profiles");
      setLoading(false);
    }
  };

  const handlePlaySample = (voiceId: string) => {
    setIsPlaying(voiceId);
    
    // Simulate playing a sample
    setTimeout(() => {
      setIsPlaying(null);
      toast.success("Voice sample playback complete");
    }, 3000);
  };

  const handleDeleteProfile = async (voiceId: string) => {
    try {
      setLoading(true);
      
      // In a real app with Supabase:
      // const { error } = await supabase
      //   .from('voice_clones')
      //   .delete()
      //   .eq('id', voiceId);
        
      // if (error) throw error;
      
      // For demo, just filter out the deleted profile
      setVoiceProfiles(voiceProfiles.filter(profile => profile.id !== voiceId));
      
      toast.success("Your voice profile has been removed");
    } catch (error) {
      console.error('Error deleting voice profile:', error);
      toast.error("Could not delete the voice profile at this time");
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
          <div className="space-y-4">
            {voiceProfiles.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                You don't have any voice profiles yet. Create one below.
              </div>
            ) : (
              <div className="grid gap-4">
                {voiceProfiles.map((profile) => (
                  <div key={profile.id} className="flex items-center justify-between p-4 border rounded-md">
                    <div>
                      <h3 className="font-medium">{profile.name}</h3>
                      <p className="text-sm text-muted-foreground">Created: {profile.created_at}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => handlePlaySample(profile.id)}
                        disabled={isPlaying === profile.id}
                      >
                        {isPlaying === profile.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Speaker className="h-4 w-4" />
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => handleDeleteProfile(profile.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6">
              <VoiceCloning onVoiceCloned={fetchVoiceProfiles} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceProfileManager;
