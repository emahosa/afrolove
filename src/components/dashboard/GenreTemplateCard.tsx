import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Play, Pause, Music, Loader2 } from 'lucide-react';
import { GenreTemplate } from '@/hooks/use-genre-templates';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface GenreTemplateCardProps {
  template: GenreTemplate;
  isSelected: boolean;
  onClick: () => void;
}

export const GenreTemplateCard = ({ template, isSelected, onClick }: GenreTemplateCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Stop audio if another card is selected
    if (isSelected === false && isPlaying) {
      audioRef.current?.pause();
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [isSelected, isPlaying]);

  const handleAudioPlay = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card selection when clicking button
    if (!template.audio_url) return;
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      return;
    }
    setIsLoading(true);
    const audio = audioRef.current || new Audio(template.audio_url);
    audioRef.current = audio;
    audio.oncanplay = () => setIsLoading(false);
    audio.onplay = () => setIsPlaying(true);
    audio.onpause = () => setIsPlaying(false);
    audio.onended = () => setIsPlaying(false);
    audio.play().catch(() => setIsLoading(false));
  };

  const handleCreateMusic = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card selection when clicking button
    navigate('/create', { state: { selectedGenre: template.genre_id, initialPrompt: template.user_prompt_guide || '' } });
  };

  return (
    <motion.div
      className={cn("glass-card cursor-pointer overflow-hidden", isSelected && 'active-breathe')}
      onClick={onClick}
      initial={false}
      animate={ isSelected
        ? { scale: 1.12, y: -12, z: 60, rotateX: -6, boxShadow: '0 30px 60px rgba(0,0,0,0.65)' }
        : { scale: 0.94, y: 0, z: 0, rotateX: 0, filter: 'blur(0.4px) brightness(0.85)' }
      }
      transition={{ type:'spring', stiffness:200, damping:22 }}
      style={{ transformStyle:'preserve-3d' }}
    >
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
            <div className="flex-1">
                <h3 className="text-lg font-bold">{template.template_name}</h3>
                <p className="text-sm text-white/70">{template.genres?.name} Template</p>
            </div>
            {template.cover_image_url && (
                <img src={template.cover_image_url} alt={template.template_name} className="w-12 h-12 rounded-lg object-cover border-2 border-white/10"/>
            )}
        </div>

        {template.user_prompt_guide && (
          <p className="text-sm text-white/70 leading-relaxed h-20 overflow-hidden">
            {template.user_prompt_guide}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          {template.audio_url && (
            <Button size="sm" onClick={handleAudioPlay} disabled={isLoading} className="flex-1 !text-xs">
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              {isLoading ? 'Loading...' : isPlaying ? 'Pause' : 'Preview'}
            </Button>
          )}
          <Button size="sm" onClick={handleCreateMusic} className="flex-1 !text-xs">
            <Music className="h-4 w-4 mr-2" />
            Create Music
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
