
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Music, Loader2 } from 'lucide-react';
import { GenreTemplate } from '@/hooks/use-genre-templates';
import { useNavigate } from 'react-router-dom';

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

  const handleAudioPlay = async () => {
    if (!template.audio_url) return;

    try {
      // Stop any currently playing audio first
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      if (isPlaying) {
        setIsPlaying(false);
        return;
      }

      setIsLoading(true);
      
      // Create new audio instance
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
        console.error('Audio playback error');
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
    <Card className="group hover:shadow-lg transition-all duration-300 bg-white/5 border-white/10 backdrop-blur-sm overflow-hidden">
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
      
      <CardContent className="space-y-4">
        <div className="flex gap-2 pt-2">
          {template.audio_url && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAudioPlay}
              disabled={isLoading}
              className="flex-1 bg-transparent border-white/30 hover:bg-white/10 text-white"
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
            variant="cta"
            className="flex-1 font-bold"
          >
            <Music className="h-4 w-4 mr-2" />
            Create Music
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
