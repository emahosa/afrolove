
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { SongRequest } from "@/hooks/use-song-requests";

type LyricsEditorProps = {
  selectedRequest: SongRequest | undefined;
  lyricsDraft: string;
  onLyricsChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

export const LyricsEditor = ({
  selectedRequest,
  lyricsDraft,
  onLyricsChange,
  onSave,
  onCancel
}: LyricsEditorProps) => {
  if (!selectedRequest) return null;

  return (
    <div className="mt-6 border-t pt-6">
      <h3 className="text-lg font-medium mb-4">
        Write Lyrics for "{selectedRequest.title}"
      </h3>
      <div className="space-y-4">
        <div>
          <Label htmlFor="song-description">Song Description</Label>
          <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted/30 rounded-md">
            {selectedRequest.description}
          </p>
        </div>
        
        <div>
          <Label htmlFor="lyrics">Lyrics</Label>
          <Textarea 
            id="lyrics" 
            className="h-64 font-mono"
            value={lyricsDraft}
            onChange={(e) => onLyricsChange(e.target.value)}
            placeholder="Write song lyrics here..."
          />
        </div>
        
        <div className="flex gap-2">
          <Button onClick={onSave}>
            <Check className="h-4 w-4 mr-2" />
            Save Lyrics
          </Button>
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
