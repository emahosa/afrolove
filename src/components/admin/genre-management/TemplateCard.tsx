
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { FileText, Edit, Trash2, Play, Pause } from "lucide-react";
import { GenreTemplate } from "@/hooks/use-genre-templates";

interface TemplateCardProps {
  template: GenreTemplate;
  playingAudio: string | null;
  onEdit: (template: GenreTemplate) => void;
  onDelete: (template: GenreTemplate) => void;
  onToggleAudio: (audioUrl: string) => void;
}

export const TemplateCard = ({
  template,
  playingAudio,
  onEdit,
  onDelete,
  onToggleAudio
}: TemplateCardProps) => {
  return (
    <Card>
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
              onClick={() => onEdit(template)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(template)}
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
              onClick={() => onToggleAudio(template.audio_url!)}
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
  );
};
