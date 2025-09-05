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
      className="bg-gray-800/40 backdrop-blur-xl border border-purple-500/20 hover:border-purple-400 transition-all duration-300 ease-in-out transform hover:-translate-y-2 hover:shadow-xl hover:shadow-purple-500/30 flex flex-col"
    >
      <img src={template.cover_image_url || '/placeholder.svg'} alt={template.template_name} className="w-full h-40 object-cover rounded-t-xl flex-shrink-0" />
      <CardContent className="p-4 flex-grow">
        <h4 className="text-xl font-semibold mb-2">{template.template_name}</h4>
        <p className="text-sm text-gray-400 mb-4">{template.genres?.name || 'Template'}</p>
      </CardContent>
      <div className="p-3 border-t border-purple-500/20">
        <div className="flex gap-3">
          <Button
            onClick={handleAudioPlay}
            className="backdrop-blur-xl bg-white/10 border border-purple-400/30 text-purple-300 hover:bg-purple-400/20 flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ease-in-out transform hover:scale-105 w-full justify-center"
          >
            <Play size={16} /> {isPlaying ? "Pause" : "Preview"}
          </Button>
          <Button
            onClick={handleCreateMusic}
            className="backdrop-blur-xl bg-white/10 border border-purple-400/30 text-purple-300 hover:bg-purple-400/20 px-4 py-2 rounded-xl transition-all duration-300 ease-in-out transform hover:scale-105 w-full justify-center"
          >
            Use Template
          </Button>
        </div>
      </div>
    </Card>
  );
};
