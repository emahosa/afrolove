
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Upload } from 'lucide-react';

export const SiteSettingsManagement = () => {
  const [heroVideoUrl, setHeroVideoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'hero_video_url')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data?.value) {
        setHeroVideoUrl(data.value as string);
      }
    } catch (error: any) {
      console.error('Error fetching site settings:', error);
      toast.error('Failed to load site settings');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video file must be less than 50MB');
      return;
    }

    try {
      setUploading(true);

      const fileName = `hero_video_${Date.now()}.${file.name.split('.').pop()}`;
      
      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(fileName);

      setHeroVideoUrl(publicUrl);
      toast.success('Video uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading video:', error);
      toast.error('Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  const saveSettings = async () => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'hero_video_url',
          value: heroVideoUrl,
          category: 'site',
          description: 'Hero section video URL'
        }, { onConflict: 'key' });

      if (error) throw error;

      toast.success('Settings saved successfully');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  if (loading) {
    return <div>Loading site settings...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hero Section Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="video-upload">Hero Video (16:9 aspect ratio recommended)</Label>
          <div className="flex gap-2 mt-2">
            <Input
              id="video-upload"
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              disabled={uploading}
            />
            <Button
              variant="outline"
              disabled={uploading}
              onClick={() => document.getElementById('video-upload')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>

        {heroVideoUrl && (
          <div>
            <Label>Current Video</Label>
            <div className="mt-2 aspect-video bg-black rounded-lg overflow-hidden">
              <video
                src={heroVideoUrl}
                controls
                className="w-full h-full object-cover"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        )}

        <Button onClick={saveSettings} disabled={uploading}>
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
};
