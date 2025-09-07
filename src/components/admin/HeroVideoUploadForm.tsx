import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { updateSetting } from '@/utils/settingsOperations';

export const HeroVideoUploadForm = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setVideoFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!videoFile) {
      toast.error('Please select a video file to upload.');
      return;
    }

    setUploading(true);
    try {
      const filePath = `public/hero-video.mp4`;
      const { error: uploadError } = await supabase.storage
        .from('site-content')
        .upload(filePath, videoFile, {
          upsert: true, // Overwrite if it already exists
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from('site-content')
        .getPublicUrl(filePath);

      if (!publicUrlData) {
        throw new Error('Could not get public URL for the uploaded video.');
      }

      const success = await updateSetting('heroVideoUrl', publicUrlData.publicUrl, 'homepage');

      if (success) {
        toast.success('Hero video uploaded and setting updated successfully!');
      } else {
        toast.error('Failed to update the hero video URL setting.');
      }

    } catch (error: any) {
      toast.error(error.message || 'Failed to upload video.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hero Section Video</CardTitle>
        <CardDescription>
          Upload a new video for the hero section of the homepage. The current video will be replaced.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="hero-video-file">Video File (MP4)</Label>
          <Input id="hero-video-file" type="file" accept="video/mp4" onChange={handleFileChange} />
        </div>
        <Button onClick={handleUpload} disabled={uploading || !videoFile}>
          {uploading ? 'Uploading...' : 'Upload Video'}
        </Button>
      </CardContent>
    </Card>
  );
};
