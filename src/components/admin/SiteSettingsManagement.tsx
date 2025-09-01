
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload } from 'lucide-react';

export const SiteSettingsManagement = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'homepage_hero_video_url')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No record found, that's ok
          setVideoUrl('');
        } else {
          toast.error('Failed to fetch site settings.');
          console.error(error);
        }
      } else {
        const parsedValue = typeof data.value === 'string' ? data.value : data.value?.url || '';
        setVideoUrl(parsedValue);
      }
      setLoading(false);
    };

    fetchSettings();
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        toast.error('Please select a video file.');
        return;
      }
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        toast.error('File size must be less than 100MB.');
        return;
      }
      setVideoFile(file);
    }
  };

  const handleUpload = async () => {
    if (!videoFile) {
      toast.error('Please select a video file to upload.');
      return;
    }

    setUploading(true);
    try {
      const timestamp = Date.now();
      const filename = `hero_video_${timestamp}_${videoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      console.log('Uploading video file:', filename);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(filename, videoFile, {
          contentType: videoFile.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(filename);

      if (!publicUrl) {
        throw new Error('Failed to get public URL for the uploaded video.');
      }

      console.log('Public URL:', publicUrl);

      // Check if setting exists
      const { data: existingSetting } = await supabase
        .from('site_settings')
        .select('id')
        .eq('key', 'homepage_hero_video_url')
        .single();

      if (existingSetting) {
        // Update existing setting
        const { error: updateError } = await supabase
          .from('site_settings')
          .update({ 
            value: publicUrl,
            updated_at: new Date().toISOString()
          })
          .eq('key', 'homepage_hero_video_url');

        if (updateError) {
          throw updateError;
        }
      } else {
        // Insert new setting
        const { error: insertError } = await supabase
          .from('site_settings')
          .insert({
            key: 'homepage_hero_video_url',
            value: publicUrl,
            category: 'site',
            description: 'Homepage hero section video URL'
          });

        if (insertError) {
          throw insertError;
        }
      }

      setVideoUrl(publicUrl);
      setVideoFile(null);
      toast.success('Hero video updated successfully.');
    } catch (error: any) {
      console.error('Upload process error:', error);
      toast.error(error.message || 'Failed to upload video.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Site Settings</CardTitle>
        <CardDescription>Manage site-wide settings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Homepage Hero Video</Label>
          {videoUrl ? (
            <div className="space-y-2">
              <video src={videoUrl} controls className="w-full rounded-md" />
              <p className="text-sm text-muted-foreground">Current video URL: {videoUrl}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No video uploaded yet.</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Upload New Video</Label>
          <div className="flex items-center space-x-2">
            <Input type="file" accept="video/*" onChange={handleFileSelect} />
            <Button onClick={handleUpload} disabled={uploading || !videoFile}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <span className="ml-2">Upload</span>
            </Button>
          </div>
          {videoFile && <p className="text-sm text-muted-foreground">Selected file: {videoFile.name}</p>}
        </div>
      </CardContent>
    </Card>
  );
};
