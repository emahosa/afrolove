import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

export default function HeroUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a video file to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append("video", file);

    try {
      const response = await fetch("/api/upload-hero-video", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();

      toast({
        title: "Upload successful",
        description: result.message,
      });
      setFile(null);

    } catch (error) {
      toast({
        title: "Upload failed",
        description: "An error occurred while uploading the video.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Hero Section Video Uploader</h3>
      <div className="flex items-center gap-4">
        <Input type="file" accept="video/mp4" onChange={handleFileChange} className="max-w-xs"/>
        <Button onClick={handleUpload} disabled={!file || isUploading}>
          {isUploading ? "Uploading..." : "Upload"}
        </Button>
      </div>
      {file && <p className="text-sm text-muted-foreground mt-2">Selected file: {file.name}</p>}
       <p className="text-xs text-muted-foreground mt-2">
        The uploaded video will replace the current hero video at <code>/public/hero.mp4</code>.
      </p>
    </div>
  );
}
