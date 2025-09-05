import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Video, Trash2, Eye, Loader2 } from 'lucide-react';

interface HeroVideo {
  id: string;
  title: string;
  video_url: string;
  is_active: boolean;
  created_at: string;
}

export const HeroVideoManagement = () => {
  const [videos, setVideos] = useState<HeroVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState('');

  useEffect(() => {
    fetchHeroVideos();
  }, []);

  const fetchHeroVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('category', 'hero_video')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const videoSettings = data?.map(setting => ({
        id: setting.id,
        title: setting.key.replace('hero_video_', '').replace('_', ' '),
        video_url: typeof setting.value === 'string' ? setting.value : setting.value?.url || '',
        is_active: setting.key === 'hero_video_active',
        created_at: setting.created_at
      })) || [];

      setVideos(videoSettings);
    } catch (error: any) {
      console.error('Error fetching hero videos:', error);
      toast.error('Failed to load hero videos');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        toast.error('Please select a video file');
        return;
      }
      
      // Validate file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast.error('File size must be less than 100MB');
        return;
      }
      
      setSelectedFile(file);
      if (!videoTitle) {
        setVideoTitle(file.name.split('.')[0]);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !videoTitle.trim()) {
      toast.error('Please select a video file and enter a title');
      return;
    }

    setUploading(true);
    try {
      // Upload video to Supabase Storage
      const timestamp = Date.now();
      const fileExtension = selectedFile.name.split('.').pop();
      const fileName = `hero_video_${timestamp}.${fileExtension}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile_images') // Using existing bucket
        .upload(`hero_videos/${fileName}`, selectedFile, {
          contentType: selectedFile.type,
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile_images')
        .getPublicUrl(`hero_videos/${fileName}`);

      // Save video settings
      const settingKey = `hero_video_${videoTitle.toLowerCase().replace(/\s+/g, '_')}`;
      
      const { error: settingsError } = await supabase
        .from('system_settings')
        .upsert({
          key: settingKey,
          value: {
            url: publicUrl,
            title: videoTitle,
            uploaded_at: new Date().toISOString()
          },
          category: 'hero_video',
          description: `Hero video: ${videoTitle}`,
          updated_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (settingsError) {
        console.error('Settings error:', settingsError);
        throw settingsError;
      }

      toast.success('Hero video uploaded successfully!');
      setSelectedFile(null);
      setVideoTitle('');
      fetchHeroVideos();
      
    } catch (error: any) {
      console.error('Error uploading hero video:', error);
      toast.error('Failed to upload hero video: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSetActive = async (videoId: string) => {
    try {
      // First, deactivate all hero videos
      await supabase
        .from('system_settings')
        .update({ key: 'hero_video_inactive' })
        .eq('category', 'hero_video')
        .neq('id', videoId);

      // Then activate the selected one
      await supabase
        .from('system_settings')
        .update({ key: 'hero_video_active' })
        .eq('id', videoId);

      toast.success('Hero video activated successfully!');
      fetchHeroVideos();
    } catch (error: any) {
      console.error('Error setting active video:', error);
      toast.error('Failed to set active video');
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this hero video?')) return;

    try {
      const { error } = await supabase
        .from('system_settings')
        .delete()
        .eq('id', videoId);

      if (error) throw error;

      toast.success('Hero video deleted successfully!');
      fetchHeroVideos();
    } catch (error: any) {
      console.error('Error deleting hero video:', error);
      toast.error('Failed to delete hero video');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Video className="mr-2 h-5 w-5" />
            Hero Video Management
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Video className="mr-2 h-5 w-5" />
          Hero Video Management
        </CardTitle>
        <CardDescription>
          Upload and manage hero videos for the user homepage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Section */}
        <div className="space-y-4 p-4 border border-dashed border-border rounded-lg">
          <h3 className="text-lg font-semibold">Upload New Hero Video</h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="video-title">Video Title</Label>
              <Input
                id="video-title"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="Enter video title"
              />
            </div>

            <div>
              <Label htmlFor="video-file">Video File</Label>
              <Input
                id="video-file"
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="file:mr-2 file:rounded file:border-0 file:bg-primary file:text-primary-foreground file:px-2 file:py-1"
              />
              {selectedFile && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>

            <Button 
              onClick={handleUpload}
              disabled={!selectedFile || !videoTitle.trim() || uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Hero Video
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Existing Videos */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Existing Hero Videos</h3>
          
          {videos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hero videos uploaded yet
            </div>
          ) : (
            <div className="grid gap-4">
              {videos.map((video) => (
                <div key={video.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-12 bg-muted rounded flex items-center justify-center">
                      <Video className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="font-medium">{video.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        Uploaded: {new Date(video.created_at).toLocaleDateString()}
                      </p>
                      {video.is_active && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(video.video_url, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    {!video.is_active && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetActive(video.id)}
                      >
                        Set Active
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(video.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};