
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { GenreTemplate } from "@/hooks/use-genre-templates";
import { Genre } from "@/hooks/use-genres";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TemplateFormDialogProps {
  genres: Genre[];
  editingTemplate: GenreTemplate | null;
  onTemplateCreate: (templateData: any) => Promise<GenreTemplate>;
  onTemplateUpdate: (id: string, templateData: any) => Promise<GenreTemplate>;
  showCreateDialog: boolean;
  setShowCreateDialog: (show: boolean) => void;
  onDialogClose: () => void;
}

export const TemplateFormDialog = ({
  genres,
  editingTemplate,
  onTemplateCreate,
  onTemplateUpdate,
  showCreateDialog,
  setShowCreateDialog,
  onDialogClose
}: TemplateFormDialogProps) => {
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

  React.useEffect(() => {
    if (editingTemplate) {
      setFormData({
        genre_id: editingTemplate.genre_id,
        template_name: editingTemplate.template_name,
        admin_prompt: editingTemplate.admin_prompt,
        user_prompt_guide: editingTemplate.user_prompt_guide || "",
        audio_url: editingTemplate.audio_url || "",
        cover_image_url: editingTemplate.cover_image_url || ""
      });
    } else {
      setFormData({
        genre_id: "",
        template_name: "",
        admin_prompt: "",
        user_prompt_guide: "",
        audio_url: "",
        cover_image_url: ""
      });
    }
  }, [editingTemplate]);

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
        await onTemplateUpdate(editingTemplate.id, {
          genre_id: formData.genre_id,
          template_name: formData.template_name.trim(),
          admin_prompt: formData.admin_prompt.trim(),
          user_prompt_guide: formData.user_prompt_guide.trim() || undefined,
          audio_url: formData.audio_url || undefined,
          cover_image_url: formData.cover_image_url || undefined
        });
      } else {
        await onTemplateCreate({
          genre_id: formData.genre_id,
          template_name: formData.template_name.trim(),
          admin_prompt: formData.admin_prompt.trim(),
          user_prompt_guide: formData.user_prompt_guide.trim() || undefined,
          audio_url: formData.audio_url || undefined,
          cover_image_url: formData.cover_image_url || undefined
        });
      }
      
      setShowCreateDialog(false);
      onDialogClose();
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={showCreateDialog} onOpenChange={(open) => {
      setShowCreateDialog(open);
      if (!open) onDialogClose();
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
            <Select value={formData.genre_id} onValueChange={(value) => setFormData(prev => ({ ...prev, genre_id: value }))}>
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
              onChange={(e) => setFormData(prev => ({ ...prev, admin_prompt: e.target.value }))}
              maxLength={100}
              rows={3}
              required
            />
            <p className="text-sm text-muted-foreground mt-1">
              {formData.admin_prompt.length}/100 characters
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
  );
};
