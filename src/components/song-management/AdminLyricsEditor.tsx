
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

type AdminLyricsEditorProps = {
  selectedRequestId: string | null;
  onUploadLyrics: (requestId: string, lyrics1: string, lyrics2: string) => Promise<boolean>;
  onCancel: () => void;
};

export const AdminLyricsEditor = ({
  selectedRequestId,
  onUploadLyrics,
  onCancel
}: AdminLyricsEditorProps) => {
  const [lyrics1, setLyrics1] = useState("");
  const [lyrics2, setLyrics2] = useState("");
  const [uploading, setUploading] = useState(false);

  if (!selectedRequestId) return null;

  const handleUpload = async () => {
    if (!lyrics1.trim() || !lyrics2.trim()) {
      toast.error("Please provide both lyric options");
      return;
    }

    setUploading(true);
    try {
      const success = await onUploadLyrics(selectedRequestId, lyrics1, lyrics2);
      if (success) {
        setLyrics1("");
        setLyrics2("");
        toast.success("Lyrics uploaded successfully! User will be notified.");
        onCancel();
      }
    } catch (error) {
      console.error('Error uploading lyrics:', error);
      toast.error("Failed to upload lyrics");
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setLyrics1("");
    setLyrics2("");
    onCancel();
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Upload Lyrics for Request
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="lyrics1" className="text-base font-medium">
              Lyrics Option 1
            </Label>
            <Textarea 
              id="lyrics1" 
              className="h-64 font-mono mt-2"
              value={lyrics1}
              onChange={(e) => setLyrics1(e.target.value)}
              placeholder="Enter the first lyric option here..."
            />
          </div>
          
          <div>
            <Label htmlFor="lyrics2" className="text-base font-medium">
              Lyrics Option 2
            </Label>
            <Textarea 
              id="lyrics2" 
              className="h-64 font-mono mt-2"
              value={lyrics2}
              onChange={(e) => setLyrics2(e.target.value)}
              placeholder="Enter the second lyric option here..."
            />
          </div>
        </div>
        
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload}
            disabled={uploading || !lyrics1.trim() || !lyrics2.trim()}
            className="bg-melody-secondary hover:bg-melody-secondary/90"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Uploading..." : "Upload Lyrics"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
