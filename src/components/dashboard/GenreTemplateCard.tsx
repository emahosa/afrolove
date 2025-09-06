import { useState, useRef, useEffect } from 'react';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Music, Loader2 } from 'lucide-react';
import { GenreTemplate } from '@/hooks/use-genre-templates';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '@/components/ui/GlassCard';

interface GenreTemplateCardProps {
  template: GenreTemplate;
}

export const GenreTemplateCard = ({ template }: GenreTemplateCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const navigate = useNavigate();

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleAudioPlay = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card selection animation
    if (!template.audio_url) return;

    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      if (isPlaying) {
        setIsPlaying(false);
        return;
      }

      setIsLoading(true);
      
      const audio = new Audio(template.audio_url);
      audioRef.current = audio;

      audio.onloadstart = () => setIsLoading(true);
      audio.oncanplay = () => setIsLoading(false);
      audio.onplay = () => {
        setIsPlaying(true);
        setIsLoading(false);
      };
      audio.onpause = () => setIsPlaying(false);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        setIsPlaying(false);
        setIsLoading(false);
      };

      await audio.play();
    } catch (error) {
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const handleCreateMusic = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card selection animation
    navigate('/create', { 
      state: { 
        selectedGenre: template.genre_id,
        initialPrompt: template.user_prompt_guide || ''
      }
    });
  };

  return (
    <GlassCard onClick={handleCreateMusic}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-white text-lg font-bold">{template.template_name}</CardTitle>
            <CardDescription className="text-white/70 text-sm">
              {template.genres?.name} Template
            </CardDescription>
          </div>
          {template.cover_image_url && (
            <img 
              src={template.cover_image_url} 
              alt={template.template_name}
              className="w-12 h-12 rounded-lg object-cover border-2 border-white/10"
            />
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {template.user_prompt_guide && (
          <p className="text-sm text-white/70 leading-relaxed h-20 overflow-hidden">
            {template.user_prompt_guide}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          {template.audio_url && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAudioPlay}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-4 w-4 mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isLoading ? 'Loading...' : isPlaying ? 'Pause' : 'Preview'}
            </Button>
          )}
          
          <Button 
            onClick={handleCreateMusic}
            size="sm"
            className="flex-1 font-bold"
          >
            <Music className="h-4 w-4 mr-2" />
            Create Music
          </Button>
        </div>
      </CardContent>
    </GlassCard>
  );
};
