import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, Play, Pause } from "lucide-react";
import { Genre } from "@/hooks/use-genres";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface GenreFormDialogProps {
  editingGenre: Genre | null;
  onGenreCreate: (genreData: any) => Promise<Genre>;
  onGenreUpdate: (id: string, genreData: any) => Promise<Genre>;
}

export const GenreFormDialog = ({ editingGenre, onGenreCreate, onGenreUpdate }: GenreFormDialogProps) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    prompt_template: "",
    description: "",
    sample_prompt: "",
    audio_preview_url: "",
    cover_image_url: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({ 
      name: "", 
      prompt_template: "", 
      description: "",
      sample_prompt: "",
      audio_preview_url: "",
      cover_image_url: ""
    });
  };

  const handleFileUpload = async (file: File, type: 'audio' | 'image') => {
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const bucket = type === 'audio' ? 'audio_files' : 'profile_images';

    try {
      setUploading(true);
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (error) throw error;

      const { data: publicUrl } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      if (type === 'audio') {
        setFormData(prev => ({ ...prev, audio_preview_url: publicUrl.publicUrl }));
      } else {
        setFormData(prev => ({ ...prev, cover_image_url: publicUrl.publicUrl }));
      }

      toast.success(`${type === 'audio' ? 'Audio' : 'Image'} uploaded successfully!`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload ${type}`);
    } finally {
      setUploading(false);
    }
  };

  const toggleAudioPreview = (audioUrl: string) => {
    if (playingAudio === audioUrl) {
      setPlayingAudio(null);
    } else {
      setPlayingAudio(audioUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.prompt_template.trim()) {
      toast.error("Genre name and prompt template are required");
      return;
    }

    if (formData.prompt_template.length > 100) {
      toast.error("Prompt template must be 100 characters or less");
      return;
    }

    if (formData.sample_prompt && formData.sample_prompt.length > 99) {
      toast.error("Sample prompt must be 99 characters or less");
      return;
    }

    try {
      setSubmitting(true);
      
      if (editingGenre) {
        await onGenreUpdate(editingGenre.id, {
          name: formData.name.trim(),
          prompt_template: formData.prompt_template.trim(),
          description: formData.description.trim() || null,
          sample_prompt: formData.sample_prompt.trim() || null,
          audio_preview_url: formData.audio_preview_url || null,
          cover_image_url: formData.cover_image_url || null
        });
      } else {
        await onGenreCreate({
          name: formData.name.trim(),
          prompt_template: formData.prompt_template.trim(),
          description: formData.description.trim() || undefined,
          sample_prompt: formData.sample_prompt.trim() || undefined,
          audio_preview_url: formData.audio_preview_url || undefined,
          cover_image_url: formData.cover_image_url || undefined
        });
      }
      
      setShowCreateDialog(false);
      resetForm();
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (genre: Genre) => {
    setFormData({
      name: genre.name,
      prompt_template: genre.prompt_template,
      description: genre.description || "",
      sample_prompt: genre.sample_prompt || "",
      audio_preview_url: genre.audio_preview_url || "",
      cover_image_url: genre.cover_image_url || ""
    });
    setShowCreateDialog(true);
  };

  // Update form when editingGenre changes
  React.useEffect(() => {
    if (editingGenre) {
      handleEdit(editingGenre);
    } else {
      resetForm();
    }
  }, [editingGenre]);

  return (
    <Dialog open={showCreateDialog} onOpenChange={(open) => {
      setShowCreateDialog(open);
      if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Genre
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingGenre ? 'Edit Genre' : 'Create New Genre'}</DialogTitle>
          <DialogDescription>
            {editingGenre ? 'Update the genre details below.' : 'Add a new music genre with templates and media.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Genre Name</Label>
            <Input
              id="name"
              placeholder="e.g., Afrobeats"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="prompt_template">Prompt Template (max 100 characters)</Label>
            <Textarea
              id="prompt_template"
              placeholder="e.g., Create an energetic Afrobeats song with vibrant rhythms..."
              value={formData.prompt_template}
              onChange={(e) => setFormData(prev => ({ ...prev, prompt_template: e.target.value }))}
              maxLength={100}
              rows={3}
              required
            />
            <p className="text-sm text-muted-foreground mt-1">
              {formData.prompt_template.length}/100 characters
            </p>
          </div>

          <div>
            <Label htmlFor="sample_prompt">Sample User Prompt (max 99 characters)</Label>
            <Input
              id="sample_prompt"
              placeholder="e.g., upbeat party vibes with drums"
              value={formData.sample_prompt}
              onChange={(e) => setFormData(prev => ({ ...prev, sample_prompt: e.target.value }))}
              maxLength={99}
            />
            <p className="text-sm text-muted-foreground mt-1">
              {formData.sample_prompt.length}/99 characters
            </p>
          </div>
          
          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              placeholder="e.g., Vibrant rhythms with West African influences"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div>
            <Label>Cover Image</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'image');
                }}
                disabled={uploading}
              />
              {formData.cover_image_url && (
                <img src={formData.cover_image_url} alt="Cover" className="w-10 h-10 rounded object-cover" />
              )}
            </div>
          </div>

          <div>
            <Label>Audio Preview</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'audio');
                }}
                disabled={uploading}
              />
              {formData.audio_preview_url && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAudioPreview(formData.audio_preview_url)}
                >
                  {playingAudio === formData.audio_preview_url ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || uploading}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingGenre ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                editingGenre ? 'Update Genre' : 'Create Genre'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
