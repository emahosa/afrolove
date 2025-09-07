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
      if (event.target.files[0].type !== 'video/mp4') {
        toast.error('Please select a valid .mp4 video file.');
        setVideoFile(null);
        event.target.value = ''; // Reset the file input
        return;
      }
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
      // Use a unique name for the file to avoid conflicts
      const fileName = `hero-video-${Date.now()}.mp4`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('site-content')
        .upload(filePath, videoFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from('site-content')
        .getPublicUrl(filePath);

      if (!publicUrlData) {
        throw new Error('Could not get public URL for the uploaded video.');
      }

      const publicUrl = publicUrlData.publicUrl;

      // To ensure the URL is always fresh, let's append a timestamp
      const urlWithTimestamp = `${publicUrl}?t=${new Date().getTime()}`;

      const success = await updateSetting('heroVideoUrl', urlWithTimestamp);

      if (success) {
        toast.success('Hero video uploaded and setting updated successfully!');
      } else {
        toast.error('Failed to update the hero video URL setting.');
      }

    } catch (error: any) {
      toast.error(error.message || 'An unexpected error occurred during upload.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hero Section Video</CardTitle>
        <CardDescription>
          Upload a new .mp4 video for the hero section of the homepage. The current video will be replaced.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="hero-video-file">Video File (MP4 only)</Label>
          <Input id="hero-video-file" type="file" accept="video/mp4" onChange={handleFileChange} />
        </div>
        <Button onClick={handleUpload} disabled={uploading || !videoFile}>
          {uploading ? 'Uploading...' : 'Upload Video'}
        </Button>
      </CardContent>
    </Card>
  );
};
