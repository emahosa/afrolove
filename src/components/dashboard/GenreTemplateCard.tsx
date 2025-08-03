
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, Play, Pause } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GenreTemplate } from "@/hooks/use-genre-templates";

interface GenreTemplateCardProps {
  template: GenreTemplate;
  isPlaying: boolean;
  onTogglePlay: (audioUrl: string) => void;
}

export const GenreTemplateCard = ({
  template,
  isPlaying,
  onTogglePlay,
}: GenreTemplateCardProps) => {
  const navigate = useNavigate();

  const handleCreateWithTemplate = () => {
    const genreId = template.genre_id;
    const prompt = template.user_prompt_guide || '';
    
    if (genreId) {
      navigate(`/create?genre=${genreId}&prompt=${encodeURIComponent(prompt)}`);
    } else {
      navigate('/create');
    }
  };

  const handlePreviewPlay = () => {
    if (template.audio_url) {
      onTogglePlay(template.audio_url);
    }
  };

  return (
    <Card className="group hover:shadow-md transition-shadow">
      {template.cover_image_url && (
        <div className="aspect-video overflow-hidden rounded-t-lg">
          <img
            src={template.cover_image_url}
            alt={template.template_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold line-clamp-1">
          {template.template_name}
        </CardTitle>
        {template.genres?.name && (
          <CardDescription className="text-sm text-muted-foreground">
            Genre: {template.genres.name}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        {template.user_prompt_guide && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {template.user_prompt_guide}
          </p>
        )}
        
        <div className="flex gap-2">
          <Button
            onClick={handleCreateWithTemplate}
            className="flex-1"
            size="sm"
          >
            <Music className="w-4 h-4 mr-1" />
            Use Template
          </Button>
          
          {template.audio_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviewPlay}
              className="px-3"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
