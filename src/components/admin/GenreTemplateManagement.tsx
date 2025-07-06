
import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { useGenreTemplates, GenreTemplate } from "@/hooks/use-genre-templates";
import { useGenres } from "@/hooks/use-genres";
import { TemplateFormDialog } from "./genre-management/TemplateFormDialog";
import { TemplateCard } from "./genre-management/TemplateCard";

export const GenreTemplateManagement = () => {
  const { templates, loading, createTemplate, updateTemplate, deleteTemplate } = useGenreTemplates();
  const { genres } = useGenres();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<GenreTemplate | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  const resetForm = () => {
    setEditingTemplate(null);
  };

  const toggleAudioPreview = (audioUrl: string) => {
    if (playingAudio === audioUrl) {
      setPlayingAudio(null);
    } else {
      setPlayingAudio(audioUrl);
    }
  };

  const handleEdit = (template: GenreTemplate) => {
    setEditingTemplate(template);
    setShowCreateDialog(true);
  };

  const handleDelete = async (template: GenreTemplate) => {
    if (confirm(`Are you sure you want to delete the "${template.template_name}" template?`)) {
      await deleteTemplate(template.id);
    }
  };

  const handleTemplateCreate = async (templateData: any): Promise<GenreTemplate> => {
    return await createTemplate(templateData);
  };

  const handleTemplateUpdate = async (id: string, templateData: any): Promise<GenreTemplate> => {
    return await updateTemplate(id, templateData);
  };

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
        
        <TemplateFormDialog
          genres={genres}
          editingTemplate={editingTemplate}
          onTemplateCreate={handleTemplateCreate}
          onTemplateUpdate={handleTemplateUpdate}
          showCreateDialog={showCreateDialog}
          setShowCreateDialog={setShowCreateDialog}
          onDialogClose={resetForm}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            playingAudio={playingAudio}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleAudio={toggleAudioPreview}
          />
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
