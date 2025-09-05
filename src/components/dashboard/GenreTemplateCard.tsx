import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Music, Loader2 } from 'lucide-react';
import { GenreTemplate } from '@/hooks/use-genre-templates';
import { useNavigate } from 'react-router-dom';
import { motion } from "framer-motion";

interface GenreTemplateCardProps {
  template: GenreTemplate;
  index: number;
}

export const GenreTemplateCard = ({ template, index }: GenreTemplateCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

  const handleAudioPlay = async () => {
    if (!template.audio_url) return;

    try {
      if (audioRef.current) {
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
            return;
        }
      }

      // Stop any other playing audio
      document.querySelectorAll('audio').forEach(audio => audio.pause());


      setIsLoading(true);
      
      const audio = new Audio(template.audio_url);
      audioRef.current = audio;

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
      console.error('Error playing audio:', error);
      setIsPlaying(false);
      setIsLoading(false);
    }
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
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="group hover:shadow-lg transition-all duration-300 bg-[#1a0b2e] border-transparent overflow-hidden rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-white text-lg font-bold">{template.template_name}</CardTitle>
              <CardDescription className="text-gray-400 text-sm">
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

        <CardContent>
          {template.user_prompt_guide && (
            <p className="text-sm text-gray-400 leading-relaxed h-20 overflow-hidden mb-4">
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
                className="flex-1 bg-transparent border-white/30 hover:bg-white/10 text-white rounded-lg text-sm"
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
              className="flex-1 bg-purple-600 hover:bg-purple-700 font-bold text-white rounded-lg text-sm"
            >
              <Music className="h-4 w-4 mr-2" />
              Create Music
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
