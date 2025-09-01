
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";

const SiteSettingsManagement: React.FC = () => {
  const [heroVideoUrl, setHeroVideoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchHeroVideo();
  }, []);

  const fetchHeroVideo = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'hero_video_url')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setHeroVideoUrl(data.value);
      }
    } catch (error) {
      console.error('Error fetching hero video:', error);
      toast.error('Failed to fetch hero video settings');
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

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video file size must be less than 50MB');
      return;
    }

    setUploading(true);
    try {
      const fileName = `hero-video-${Date.now()}.${file.name.split('.').pop()}`;
      
      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(fileName);

      // Save to site_settings
      const { error: saveError } = await supabase
        .from('site_settings')
        .upsert({
          key: 'hero_video_url',
          value: publicUrl,
          description: 'Hero section background video URL'
        }, { onConflict: 'key' });

      if (saveError) throw saveError;

      setHeroVideoUrl(publicUrl);
      toast.success('Hero video uploaded successfully');
    } catch (error) {
      console.error('Error uploading hero video:', error);
      toast.error('Failed to upload hero video');
    } finally {
      setUploading(false);
    }
  };

  const removeHeroVideo = async () => {
    try {
      const { error } = await supabase
        .from('site_settings')
        .delete()
        .eq('key', 'hero_video_url');

      if (error) throw error;

      setHeroVideoUrl('');
      toast.success('Hero video removed successfully');
    } catch (error) {
      console.error('Error removing hero video:', error);
      toast.error('Failed to remove hero video');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading site settings...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Site Settings Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Hero Section Video</h3>
          <p className="text-sm text-muted-foreground">
            Upload a video for the hero section background (16:9 aspect ratio recommended, max 50MB)
          </p>
          
          {heroVideoUrl ? (
            <div className="space-y-4">
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  src={heroVideoUrl}
                  controls
                  className="w-full h-full object-cover"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={removeHeroVideo}>
                  <X className="mr-2 h-4 w-4" />
                  Remove Video
                </Button>
                <Label htmlFor="video-upload" className="cursor-pointer">
                  <Button variant="outline" asChild>
                    <span>
                      <Upload className="mr-2 h-4 w-4" />
                      Replace Video
                    </span>
                  </Button>
                </Label>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">No hero video uploaded</p>
              <Label htmlFor="video-upload" className="cursor-pointer">
                <Button disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Video
                    </>
                  )}
                </Button>
              </Label>
            </div>
          )}
          
          <Input
            id="video-upload"
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleVideoUpload}
            disabled={uploading}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default SiteSettingsManagement;
