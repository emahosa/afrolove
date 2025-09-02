import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ReproductionRequestData } from '@/pages/ReproduceTrack';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface Song {
  id: string;
  title: string;
  audio_url: string | null;
}

const fetchUserSongs = async (userId: string): Promise<Song[]> => {
  const { data, error } = await supabase
    .from('songs')
    .select('id, title, audio_url')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

interface Props {
  onNext: () => void;
  updateRequestData: (data: Partial<ReproductionRequestData>) => void;
}

export const Step1_SelectTrack: React.FC<Props> = ({ onNext, updateRequestData }) => {
  const { user } = useAuth();
  const { data: songs, isLoading } = useQuery({
    queryKey: ['userSongs', user?.id],
    queryFn: () => fetchUserSongs(user!.id),
    enabled: !!user,
  });
  const [isUploading, setIsUploading] = useState(false);

  const handleSelectSong = (song: Song) => {
    if (!song.audio_url) {
        toast.error("This song does not have an audio file associated with it.");
        return;
    }
    updateRequestData({ originalTrackUrl: song.audio_url });
    onNext();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    toast.info("Uploading your track...");

    try {
      const filePath = `${user.id}/original-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('original-ai-tracks')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
          .from('original-ai-tracks')
          .getPublicUrl(filePath);

      if (!publicUrl) throw new Error("Could not get public URL for uploaded file.");

      toast.success("Track uploaded successfully!");
      updateRequestData({ originalTrackUrl: publicUrl });
      onNext();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Step 1: Select Track Source</h2>
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <Label htmlFor="upload-track" className="text-lg font-semibold">Upload a track</Label>
            <p className="text-sm text-muted-foreground mb-2">Upload an AI-generated track from your computer.</p>
            <Input id="upload-track" type="file" accept="audio/*" onChange={handleFileUpload} disabled={isUploading} />
            {isUploading && <Loader2 className="h-4 w-4 animate-spin mt-2" />}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-2">Or select from your library</h3>
            {isLoading && <Loader2 className="h-6 w-6 animate-spin" />}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {songs && songs.map(song => (
                <div key={song.id} className="flex items-center justify-between p-2 border rounded-lg">
                  <p>{song.title}</p>
                  <Button size="sm" onClick={() => handleSelectSong(song)}>Select</Button>
                </div>
              ))}
              {songs?.length === 0 && <p className="text-sm text-muted-foreground">No completed songs in your library.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
