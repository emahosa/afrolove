
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Music, Loader2 } from 'lucide-react';
import { Genre } from '@/hooks/use-genres';
import { useNavigate } from 'react-router-dom';

interface GenreCardProps {
  genre: Genre;
}

export const GenreCard = ({ genre }: GenreCardProps) => {
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
    if (!genre.audio_preview_url) return;

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
      const audio = new Audio(genre.audio_preview_url);
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
        selectedGenre: genre.id,
        initialPrompt: genre.sample_prompt || ''
      }
    });
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-white text-lg">{genre.name}</CardTitle>
            <CardDescription className="text-gray-300 text-sm">
              {genre.description || 'Music Genre'}
            </CardDescription>
          </div>
          {genre.cover_image_url && (
            <img 
              src={genre.cover_image_url} 
              alt={genre.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {genre.sample_prompt && (
          <p className="text-sm text-gray-400 leading-relaxed">
            {genre.sample_prompt}
          </p>
        )}

        <div className="flex gap-2">
          {genre.audio_preview_url && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAudioPlay}
              disabled={isLoading}
              className="flex-1 border-violet-600 text-violet-400 hover:bg-violet-600 hover:text-white"
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
            className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Music className="h-4 w-4 mr-2" />
            Create Music
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
