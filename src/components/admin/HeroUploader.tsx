import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function HeroUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'video/mp4') {
        toast.error('Invalid file type. Please select an MP4 video.');
        setFile(null);
        e.target.value = ''; // Reset file input
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('No file selected.');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/hero-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      toast.success('Video uploaded successfully. It will now be live on the homepage.');
      setFile(null);
      // It's tricky to reset file input value programmatically, but this is a common approach
      const fileInput = document.getElementById('hero-video-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  // Note: This component does NOT use any glass-morphic styles.
  // It uses the default shadcn/ui styles which are not part of the new design system.
  // This is intentional as per the requirements.
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hero Section Video</CardTitle>
        <CardDescription>
          Upload a new video for the homepage hero section. The file must be an MP4 and will replace the current video.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          id="hero-video-upload"
          type="file"
          accept="video/mp4"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <Button onClick={handleUpload} disabled={!file || uploading}>
          {uploading ? 'Uploading...' : 'Upload Video'}
        </Button>
      </CardContent>
    </Card>
  );
}
