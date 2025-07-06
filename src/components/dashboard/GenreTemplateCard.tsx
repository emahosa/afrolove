
import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { Genre } from '@/hooks/use-genres';

interface GenreTemplateCardProps {
  genre: Genre;
  onSelect: (genre: Genre) => void;
}

export const GenreTemplateCard: React.FC<GenreTemplateCardProps> = ({ genre, onSelect }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (genre.audio_preview_url && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current || !genre.audio_preview_url) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const handleCardClick = () => {
    onSelect(genre);
  };

  return (
    <Card 
      className="cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleCardClick}
    >
      <CardContent className="p-0 relative">
        <div className="aspect-square relative overflow-hidden rounded-t-lg">
          {genre.cover_image_url ? (
            <img 
              src={genre.cover_image_url} 
              alt={genre.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-melody-primary to-melody-secondary flex items-center justify-center">
              <span className="text-white text-2xl font-bold">{genre.name.charAt(0)}</span>
            </div>
          )}
          
          {/* Play/Pause overlay */}
          <div className={`absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            {genre.audio_preview_url && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:text-melody-secondary"
                onClick={togglePlayPause}
              >
                {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
              </Button>
            )}
          </div>
        </div>
        
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2">{genre.name}</h3>
          {genre.description && (
            <p className="text-sm text-muted-foreground mb-2">{genre.description}</p>
          )}
          {genre.sample_prompt && (
            <p className="text-xs text-muted-foreground italic">
              "{genre.sample_prompt.substring(0, 50)}..."
            </p>
          )}
        </div>

        {/* Hidden audio element */}
        {genre.audio_preview_url && (
          <audio
            ref={audioRef}
            src={genre.audio_preview_url}
            preload="metadata"
            onEnded={handleAudioEnded}
            onError={() => console.error('Audio playback error')}
          />
        )}
      </CardContent>
    </Card>
  );
};
