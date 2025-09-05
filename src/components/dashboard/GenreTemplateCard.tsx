import { useState, useRef, useEffect } from 'react';
import { GenreTemplate } from '@/hooks/use-genre-templates';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

interface GenreTemplateCardProps {
  template: GenreTemplate;
}

export const GenreTemplateCard = ({ template }: GenreTemplateCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleAudioPlay = () => {
    if (!template.audio_url) return;

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
      return;
    }

    const audio = new Audio(template.audio_url);
    audioRef.current = audio;
    audio.play();
    setIsPlaying(true);

    audio.onended = () => {
      setIsPlaying(false);
    };
  };

  const handleCreateMusic = () => {
    navigate('/create', { 
      state: { 
        selectedGenre: template.genre_id,
        initialPrompt: template.user_prompt_guide || ''
      }
    });
  };

  return (
    <Card
      className="bg-gray-800/40 backdrop-blur-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/20"
    >
      <img src={template.cover_image_url || '/placeholder.svg'} alt={template.template_name} className="w-full h-32 object-cover rounded-t-xl flex-shrink-0" />
      <CardContent className="p-3">
        <h4 className="text-lg font-semibold mb-1">{template.template_name}</h4>
        <p className="text-xs text-gray-400 mb-3">{template.genres?.name || 'Template'}</p>
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleAudioPlay}
            size="sm"
            className="backdrop-blur-xl bg-white/10 text-purple-300 hover:bg-purple-400/20 flex items-center gap-1.5 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 w-full justify-center"
          >
            <Play size={14} /> {isPlaying ? "Pause" : "Preview"}
          </Button>
          <Button
            onClick={handleCreateMusic}
            size="sm"
            className="backdrop-blur-xl bg-white/10 text-purple-300 hover:bg-purple-400/20 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 w-full justify-center"
          >
            Use Template
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
