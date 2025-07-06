
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, Edit, Trash2, Play, Pause } from "lucide-react";
import { Genre } from "@/hooks/use-genres";

interface GenreCardProps {
  genre: Genre;
  playingAudio: string | null;
  onEdit: (genre: Genre) => void;
  onDelete: (genre: Genre) => void;
  onToggleAudio: (audioUrl: string) => void;
}

export const GenreCard = ({ genre, playingAudio, onEdit, onDelete, onToggleAudio }: GenreCardProps) => {
  return (
    <Card>
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
              onClick={() => onEdit(genre)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(genre)}
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
              onClick={() => onToggleAudio(genre.audio_preview_url!)}
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
  );
};
