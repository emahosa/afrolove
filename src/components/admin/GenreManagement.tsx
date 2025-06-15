
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Music, Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { useGenres, Genre } from "@/hooks/use-genres";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const GenreManagement = () => {
  const { genres, loading, createGenre, updateGenre, deleteGenre } = useGenres();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingGenre, setEditingGenre] = useState<Genre | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    prompt_template: "",
    description: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({ name: "", prompt_template: "", description: "" });
    setEditingGenre(null);
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

    try {
      setSubmitting(true);
      
      if (editingGenre) {
        await updateGenre(editingGenre.id, {
          name: formData.name.trim(),
          prompt_template: formData.prompt_template.trim(),
          description: formData.description.trim() || null
        });
      } else {
        await createGenre({
          name: formData.name.trim(),
          prompt_template: formData.prompt_template.trim(),
          description: formData.description.trim() || undefined
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
      description: genre.description || ""
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
          <p className="text-muted-foreground">Manage music genres and their AI prompts</p>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGenre ? 'Edit Genre' : 'Create New Genre'}</DialogTitle>
              <DialogDescription>
                {editingGenre ? 'Update the genre details below.' : 'Add a new music genre with an AI prompt template.'}
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
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead>Prompt Template</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {genres.length > 0 ? (
                  genres.map((genre) => (
                    <TableRow key={genre.id}>
                      <TableCell className="font-medium">{genre.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {genre.description || "-"}
                      </TableCell>
                      <TableCell>
                        <p className="max-w-xs truncate" title={genre.prompt_template}>
                          {genre.prompt_template}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(genre)}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(genre)}>
                            <Trash2 className="h-4 w-4" />
                             <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No genres to display.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
