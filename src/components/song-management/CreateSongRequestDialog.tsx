
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserSongRequests } from "@/hooks/use-user-song-requests";
import { useGenres } from "@/hooks/use-genres";
import { toast } from "sonner";
import { Music, Loader2 } from "lucide-react";

interface CreateSongRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateSongRequestDialog = ({ open, onOpenChange, onSuccess }: CreateSongRequestDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedGenreId, setSelectedGenreId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { createSongRequest } = useUserSongRequests();
  const { genres, loading: genresLoading } = useGenres();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!selectedGenreId) {
      toast.error("Please select a genre");
      return;
    }

    setSubmitting(true);
    try {
      const success = await createSongRequest(title.trim(), description.trim(), selectedGenreId);
      if (success) {
        setTitle("");
        setDescription("");
        setSelectedGenreId("");
        onSuccess();
        toast.success("Song request submitted successfully!");
      }
    } catch (error) {
      console.error("Error creating song request:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setTitle("");
    setDescription("");
    setSelectedGenreId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Custom Song Request</DialogTitle>
          <DialogDescription>
            Submit a new custom song request. Our team will create lyrics for your approval.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Song Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter your song title..."
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="genre">Genre</Label>
            {genresLoading ? (
              <div className="flex items-center justify-center p-4 border rounded-md">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading genres...</span>
              </div>
            ) : (
              <Select
                value={selectedGenreId}
                onValueChange={setSelectedGenreId}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a genre" />
                </SelectTrigger>
                <SelectContent>
                  {genres.map((genre) => (
                    <SelectItem key={genre.id} value={genre.id}>
                      <div className="flex items-center gap-2">
                        <Music className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{genre.name}</div>
                          {genre.description && (
                            <div className="text-xs text-muted-foreground">{genre.description}</div>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your song concept, theme, mood, or any specific requirements..."
              className="min-h-24"
              disabled={submitting}
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !title.trim() || !description.trim() || !selectedGenreId}
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
