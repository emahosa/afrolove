@@ .. @@
-import { supabase } from '@/integrations/supabase/client';
-import { updateSetting } from '@/utils/settingsOperations';
+import { supabase } from '@/integrations/supabase/client';

@@ .. @@
   const handleUpload = async () => {
     if (!videoFile) {
       toast.error('Please select a video file to upload.');
       return;
     }

     setUploading(true);
     try {
-      const filePath = `public/hero-video.mp4`;
-      const { error: uploadError } = await supabase.storage
-        .from('site-content')
-        .upload(filePath, videoFile, {
-          upsert: true, // Overwrite if it already exists
-        });
+      // Use existing profile_images bucket with hero_videos folder
+      const timestamp = Date.now();
+      const fileExt = videoFile.name.split('.').pop() || 'mp4';
+      const filePath = `hero_videos/hero_video_${timestamp}.${fileExt}`;
+      
+      const { data: uploadData, error: uploadError } = await supabase.storage
+        .from('profile_images')
+        .upload(filePath, videoFile, {
+          upsert: true,
+        });

       if (uploadError) {
+        console.error('Upload error:', uploadError);
         throw uploadError;
       }

-      const { data: publicUrlData } = supabase.storage
-        .from('site-content')
+      const { data: publicUrlData } = supabase.storage
+        .from('profile_images')
         .getPublicUrl(filePath);

-      if (!publicUrlData) {
+      if (!publicUrlData?.publicUrl) {
         throw new Error('Could not get public URL for the uploaded video.');
       }

-      const success = await updateSetting('heroVideoUrl', publicUrlData.publicUrl, 'homepage');
+      console.log('Video uploaded successfully, URL:', publicUrlData.publicUrl);
+      
+      // Update system settings using direct database call
+      const { data: { user } } = await supabase.auth.getUser();
+      if (!user) {
+        throw new Error('User not authenticated');
+      }

-      if (success) {
-        toast.success('Hero video uploaded and setting updated successfully!');
-      } else {
-        toast.error('Failed to update the hero video URL setting.');
-      }
+      const { error: settingsError } = await supabase
+        .from('system_settings')
+        .upsert({
+          key: 'hero_video_url',
+          value: publicUrlData.publicUrl,
+          category: 'homepage',
+          description: 'URL for the hero section background video',
+          updated_by: user.id,
+          updated_at: new Date().toISOString()
+        }, { onConflict: 'key' });

+      if (settingsError) {
+        console.error('Settings error:', settingsError);
+        throw new Error('Failed to update hero video setting: ' + settingsError.message);
+      }

+      toast.success('Hero video uploaded and activated successfully!');
+      
+      // Refresh the current video display
+      await fetchCurrentVideo();

     } catch (error: any) {
+      console.error('Upload process error:', error);
       toast.error(error.message || 'Failed to upload video.');
     } finally {
       setUploading(false);
     }
   };

+  const fetchCurrentVideo = async () => {
+    try {
+      const { data, error } = await supabase
+        .from('system_settings')
+        .select('value')
+        .eq('key', 'hero_video_url')
+        .single();
+
+      if (error && error.code !== 'PGRST116') {
+        console.error('Error fetching current video:', error);
+        return;
+      }
+
+      if (data?.value) {
+        setCurrentVideoUrl(data.value);
+      }
+    } catch (error) {
+      console.error('Error fetching current video:', error);
+    }
+  };
+
+  useEffect(() => {
+    fetchCurrentVideo();
+  }, []);

   return (
-    <Card>
+    <div className="space-y-6">
+      {currentVideoUrl && (
+        <Card>
+          <CardHeader>
+            <CardTitle>Current Hero Video</CardTitle>
+            <CardDescription>This is the video currently displayed on the homepage</CardDescription>
+          </CardHeader>
+          <CardContent>
+            <video 
+              src={currentVideoUrl} 
+              controls 
+              className="w-full max-w-2xl rounded-lg"
+              style={{ maxHeight: '400px' }}
+            >
+              Your browser does not support the video tag.
+            </video>
+          </CardContent>
+        </Card>
+      )}
+      
+      <Card>
       <CardHeader>
-        <CardTitle>Hero Section Video</CardTitle>
+        <CardTitle>Upload New Hero Video</CardTitle>
         <CardDescription>
-          Upload a new video for the hero section of the homepage. The current video will be replaced.
+          Upload a new video for the hero section background. Recommended: MP4 format, under 50MB.
         </CardDescription>
       </CardHeader>
       <CardContent className="space-y-4">
         <div>
-          <Label htmlFor="hero-video-file">Video File (MP4)</Label>
-          <Input id="hero-video-file" type="file" accept="video/mp4" onChange={handleFileChange} />
+          <Label htmlFor="hero-video-file">Video File</Label>
+          <Input 
+            id="hero-video-file" 
+            type="file" 
+            accept="video/mp4,video/webm,video/ogg" 
+            onChange={handleFileChange} 
+          />
+          {videoFile && (
+            <p className="text-sm text-muted-foreground mt-2">
+              Selected: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
+            </p>
+          )}
         </div>
         <Button onClick={handleUpload} disabled={uploading || !videoFile}>
-          {uploading ? 'Uploading...' : 'Upload Video'}
+          {uploading ? 'Uploading...' : 'Upload & Activate Video'}
         </Button>
       </CardContent>
     </Card>
+    </div>
   );
 };