import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function HeroUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (e.target.files[0].type !== "video/mp4") {
        toast.error("Invalid file type. Please upload a video/mp4 file.");
        setFile(null);
        e.target.value = ''; // Reset file input
        return;
      }
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file to upload.");
      return;
    }

    setUploading(true);
    try {
      // We are uploading to a 'public' bucket with the name 'hero.mp4'.
      // The 'public' bucket should have public read access.
      // The `upsert: true` option will overwrite the file if it already exists.
      const { error } = await supabase.storage
        .from("public")
        .upload("hero.mp4", file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        throw error;
      }

      toast.success("Hero video uploaded successfully! It may take a moment to update on the homepage.");
      setFile(null);
      // It's good practice to clear the file input after upload
      // This is hard to do programmatically, but this is a simple component.
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error("Upload failed: " + error.message);
      } else {
        toast.error("An unknown error occurred during upload.");
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hero Video Uploader</CardTitle>
        <CardDescription>
          Upload a new video for the homepage hero section. The existing video will be replaced.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="file"
          accept="video/mp4"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <Button onClick={handleUpload} disabled={!file || uploading}>
          {uploading ? "Uploading..." : "Upload Video"}
        </Button>
      </CardContent>
    </Card>
  );
}
