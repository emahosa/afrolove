
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { Genre } from "@/hooks/use-genres";
import { toast } from "sonner";

interface SimpleGenreFormDialogProps {
  editingGenre: Genre | null;
  onGenreCreate: (genreData: any) => Promise<Genre>;
  onGenreUpdate: (id: string, genreData: any) => Promise<Genre>;
}

export const SimpleGenreFormDialog = ({ editingGenre, onGenreCreate, onGenreUpdate }: SimpleGenreFormDialogProps) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    prompt_template: "",
    description: "",
    sample_prompt: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({ 
      name: "", 
      prompt_template: "", 
      description: "",
      sample_prompt: ""
    });
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
          sample_prompt: formData.sample_prompt.trim() || null
        });
      } else {
        await onGenreCreate({
          name: formData.name.trim(),
          prompt_template: formData.prompt_template.trim(),
          description: formData.description.trim() || undefined,
          sample_prompt: formData.sample_prompt.trim() || undefined
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
      sample_prompt: genre.sample_prompt || ""
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingGenre ? 'Edit Genre' : 'Create New Genre'}</DialogTitle>
          <DialogDescription>
            {editingGenre ? 'Update the genre details below.' : 'Add a new music genre with basic information.'}
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
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
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
