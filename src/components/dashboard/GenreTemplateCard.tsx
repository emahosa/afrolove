
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Pause } from "lucide-react";
import { GenreTemplate } from "@/hooks/use-genre-templates";

interface GenreTemplateCardProps {
  template: GenreTemplate;
  onSelect: (template: GenreTemplate) => void;
}

export const GenreTemplateCard = ({ template, onSelect }: GenreTemplateCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const handleAudioToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!template.audio_url) return;

    if (audio) {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play();
        setIsPlaying(true);
      }
    } else {
      const newAudio = new Audio(template.audio_url);
      newAudio.addEventListener('ended', () => setIsPlaying(false));
      newAudio.addEventListener('pause', () => setIsPlaying(false));
      newAudio.play();
      setAudio(newAudio);
      setIsPlaying(true);
    }
  };

  const handleCardClick = () => {
    onSelect(template);
  };

  const backgroundImage = template.cover_image_url 
    ? `url(${template.cover_image_url})`
    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

  return (
    <Card 
      className="cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group overflow-hidden"
      onClick={handleCardClick}
    >
      <div 
        className="relative h-48 bg-cover bg-center"
        style={{ backgroundImage }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-40 group-hover:bg-opacity-50 transition-all duration-300" />
        
        {template.audio_url && (
          <button
            onClick={handleAudioToggle}
            className="absolute top-3 right-3 bg-white bg-opacity-20 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-opacity-30"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 text-white" />
            ) : (
              <Play className="h-4 w-4 text-white" />
            )}
          </button>
        )}

        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-white font-bold text-lg mb-1 line-clamp-2">
            {template.template_name}
          </h3>
          {template.genres?.name && (
            <Badge variant="secondary" className="bg-white bg-opacity-20 text-white border-0">
              {template.genres.name}
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="p-4">
        {template.user_prompt_guide && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {template.user_prompt_guide}
          </p>
        )}
        
        <p className="text-xs text-muted-foreground italic line-clamp-1">
          "{template.admin_prompt}"
        </p>
      </CardContent>
    </Card>
  );
};
