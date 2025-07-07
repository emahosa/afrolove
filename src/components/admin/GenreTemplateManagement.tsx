
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Edit, Trash2, Loader2, Upload, Play, Pause } from "lucide-react";
import { useGenreTemplates, GenreTemplate } from "@/hooks/use-genre-templates";
import { useGenres } from "@/hooks/use-genres";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const GenreTemplateManagement = () => {
  const { templates, loading, createTemplate, updateTemplate, deleteTemplate } = useGenreTemplates();
  const { genres } = useGenres();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<GenreTemplate | null>(null);
  const [formData, setFormData] = useState({
    genre_id: "",
    template_name: "",
    admin_prompt: "",
    user_prompt_guide: "",
    audio_url: "",
    cover_image_url: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({ 
      genre_id: "",
      template_name: "", 
      admin_prompt: "", 
      user_prompt_guide: "",
      audio_url: "",
      cover_image_url: ""
    });
    setEditingTemplate(null);
  };

  const handleGenreChange = (genreId: string) => {
    const selectedGenre = genres.find(g => g.id === genreId);
    setFormData(prev => ({ 
      ...prev, 
      genre_id: genreId,
      admin_prompt: selectedGenre?.prompt_template || ""
    }));
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
        setFormData(prev => ({ ...prev, audio_url: publicUrl.publicUrl }));
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
    
    if (!formData.genre_id || !formData.template_name.trim() || !formData.admin_prompt.trim()) {
      toast.error("Genre, template name, and admin prompt are required");
      return;
    }

    if (formData.admin_prompt.length > 100) {
      toast.error("Admin prompt must be 100 characters or less");
      return;
    }

    if (formData.user_prompt_guide && formData.user_prompt_guide.length > 99) {
      toast.error("User prompt guide must be 99 characters or less");
      return;
    }

    try {
      setSubmitting(true);
      
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, {
          genre_id: formData.genre_id,
          template_name: formData.template_name.trim(),
          admin_prompt: formData.admin_prompt.trim(),
          user_prompt_guide: formData.user_prompt_guide.trim() || undefined,
          audio_url: formData.audio_url || undefined,
          cover_image_url: formData.cover_image_url || undefined
        });
      } else {
        await createTemplate({
          genre_id: formData.genre_id,
          template_name: formData.template_name.trim(),
          admin_prompt: formData.admin_prompt.trim(),
          user_prompt_guide: formData.user_prompt_guide.trim() || undefined,
          audio_url: formData.audio_url || undefined,
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

  const handleEdit = (template: GenreTemplate) => {
    setFormData({
      genre_id: template.genre_id,
      template_name: template.template_name,
      admin_prompt: template.admin_prompt,
      user_prompt_guide: template.user_prompt_guide || "",
      audio_url: template.audio_url || "",
      cover_image_url: template.cover_image_url || ""
    });
    setEditingTemplate(template);
    setShowCreateDialog(true);
  };

  const handleDelete = async (template: GenreTemplate) => {
    if (confirm(`Are you sure you want to delete the "${template.template_name}" template?`)) {
      await deleteTemplate(template.id);
    }
  };

  const canAddMoreToPrompt = formData.admin_prompt.length < 100;

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading genre templates...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Genre Templates</h3>
          <p className="text-muted-foreground">Manage predefined genre templates with admin prompts and media</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create New Template'}</DialogTitle>
              <DialogDescription>
                {editingTemplate ? 'Update the template details below.' : 'Add a new genre template with predefined prompts and media.'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="genre_id">Genre</Label>
                <Select value={formData.genre_id} onValueChange={handleGenreChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {genres.map((genre) => (
                      <SelectItem key={genre.id} value={genre.id}>
                        {genre.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="template_name">Template Name</Label>
                <Input
                  id="template_name"
                  placeholder="e.g., Heartbreak Amapiano"
                  value={formData.template_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, template_name: e.target.value }))}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="admin_prompt">Admin Prompt (max 100 characters)</Label>
                <Textarea
                  id="admin_prompt"
                  placeholder="e.g., emotional heartbreak in Lagos with piano melody"
                  value={formData.admin_prompt}
                  onChange={(e) => {
                    if (e.target.value.length <= 100) {
                      setFormData(prev => ({ ...prev, admin_prompt: e.target.value }));
                    }
                  }}
                  maxLength={100}
                  rows={3}
                  required
                  disabled={!canAddMoreToPrompt && formData.admin_prompt.length === 100}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {formData.admin_prompt.length}/100 characters
                  {!canAddMoreToPrompt && " (Maximum reached)"}
                </p>
              </div>

              <div>
                <Label htmlFor="user_prompt_guide">User Prompt Guide (max 99 characters)</Label>
                <Input
                  id="user_prompt_guide"
                  placeholder="e.g., from a girl abandoned at Eko Hotel"
                  value={formData.user_prompt_guide}
                  onChange={(e) => setFormData(prev => ({ ...prev, user_prompt_guide: e.target.value }))}
                  maxLength={99}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {formData.user_prompt_guide.length}/99 characters
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>Cover Image</Label>
                  <div className="space-y-2">
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
                      <div className="flex items-center gap-2">
                        <img src={formData.cover_image_url} alt="Cover" className="w-12 h-12 rounded object-cover" />
                        <span className="text-sm text-green-600">Image uploaded</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Audio Preview</Label>
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'audio');
                      }}
                      disabled={uploading}
                    />
                    {formData.audio_url && (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleAudioPreview(formData.audio_url)}
                        >
                          {playingAudio === formData.audio_url ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          Preview
                        </Button>
                        <span className="text-sm text-green-600">Audio uploaded</span>
                      </div>
                    )}
                  </div>
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
                      {editingTemplate ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingTemplate ? 'Update Template' : 'Create Template'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <CardTitle className="text-lg">{template.template_name}</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(template)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>Genre: {template.genres?.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {template.cover_image_url && (
                <img src={template.cover_image_url} alt={template.template_name} className="w-full h-32 object-cover rounded" />
              )}
              
              {template.audio_url && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAudioPreview(template.audio_url!)}
                  >
                    {playingAudio === template.audio_url ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    Audio Preview
                  </Button>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Admin Prompt:</Label>
                <p className="text-sm text-muted-foreground mt-1 break-words">
                  {template.admin_prompt}
                </p>
              </div>

              {template.user_prompt_guide && (
                <div>
                  <Label className="text-sm font-medium">User Prompt Guide:</Label>
                  <p className="text-sm text-muted-foreground mt-1 break-words">
                    {template.user_prompt_guide}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No templates found</h3>
          <p className="text-muted-foreground mb-4">
            Create your first genre template to provide guided AI music generation.
          </p>
        </div>
      )}

      {/* Hidden audio elements for playback */}
      {templates.map((template) => (
        template.audio_url && (
          <audio
            key={template.id}
            src={template.audio_url}
            onEnded={() => setPlayingAudio(null)}
            onPlay={() => setPlayingAudio(template.audio_url!)}
            onPause={() => setPlayingAudio(null)}
            ref={(audio) => {
              if (audio) {
                if (playingAudio === template.audio_url) {
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
