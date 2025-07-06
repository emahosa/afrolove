
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Music, Plus, Edit, Trash2, Loader2, Upload, Play, Pause } from "lucide-react";
import { useGenres, Genre } from "@/hooks/use-genres";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const GenreManagement = () => {
  const { genres, loading, createGenre, updateGenre, deleteGenre } = useGenres();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingGenre, setEditingGenre] = useState<Genre | null>(null);
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
    setEditingGenre(null);
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
        await updateGenre(editingGenre.id, {
          name: formData.name.trim(),
          prompt_template: formData.prompt_template.trim(),
          description: formData.description.trim() || null,
          sample_prompt: formData.sample_prompt.trim() || null,
          audio_preview_url: formData.audio_preview_url || null,
          cover_image_url: formData.cover_image_url || null
        });
      } else {
        await createGenre({
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
    setEditingGenre(genre);
    setShowCreateDialog(true);
  };

  const handleDelete = async (genre: Genre) => {
    if (confirm(`Are you sure you want to delete the "${genre.name}" genre?`)) {
      await deleteGenre(genre.id);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading genres...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Genre Management</h2>
          <p className="text-muted-foreground">Manage music genres with templates, audio previews, and cover images</p>
        </div>
        
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {genres.map((genre) => (
          <Card key={genre.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  <CardTitle className="text-lg">{genre.name}</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(genre)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(genre)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {genre.description && (
                <CardDescription>{genre.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {genre.cover_image_url && (
                <img src={genre.cover_image_url} alt={genre.name} className="w-full h-32 object-cover rounded" />
              )}
              
              {genre.audio_preview_url && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAudioPreview(genre.audio_preview_url!)}
                  >
                    {playingAudio === genre.audio_preview_url ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    Audio Preview
                  </Button>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Prompt Template:</Label>
                <p className="text-sm text-muted-foreground mt-1 break-words">
                  {genre.prompt_template}
                </p>
              </div>

              {genre.sample_prompt && (
                <div>
                  <Label className="text-sm font-medium">Sample Prompt:</Label>
                  <p className="text-sm text-muted-foreground mt-1 break-words">
                    {genre.sample_prompt}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {genres.length === 0 && (
        <div className="text-center py-12">
          <Music className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No genres found</h3>
          <p className="text-muted-foreground mb-4">
            Create your first genre to get started with AI music generation.
          </p>
        </div>
      )}

      {/* Hidden audio elements for playback */}
      {genres.map((genre) => (
        genre.audio_preview_url && (
          <audio
            key={genre.id}
            src={genre.audio_preview_url}
            onEnded={() => setPlayingAudio(null)}
            onPlay={() => setPlayingAudio(genre.audio_preview_url!)}
            onPause={() => setPlayingAudio(null)}
            ref={(audio) => {
              if (audio) {
                if (playingAudio === genre.audio_preview_url) {
                  audio.play();
                } else {
                  audio.pause();
                }
              }
            }}
          />
        )
      ))}
    </div>
  );
};

export default GenreManagement;
