
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

  // Generate random height for Pinterest-style layout
  const cardHeight = Math.floor(Math.random() * 200) + 250; // Random height between 250px and 450px

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
      className="cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group overflow-hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleCardClick}
      style={{ height: `${cardHeight}px` }}
    >
      <CardContent className="p-0 relative h-full">
        <div className="relative h-full overflow-hidden rounded-lg">
          {genre.cover_image_url ? (
            <img 
              src={genre.cover_image_url} 
              alt={genre.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div 
              className="w-full h-full flex items-center justify-center text-white text-2xl font-bold"
              style={{
                background: `linear-gradient(135deg, hsl(${Math.random() * 360}, 70%, 50%), hsl(${Math.random() * 360}, 70%, 30%))`
              }}
            >
              {genre.name.charAt(0)}
            </div>
          )}
          
          {/* Overlay with gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          
          {/* Play/Pause overlay */}
          <div className={`absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            {genre.audio_preview_url && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:text-melody-secondary bg-black/20 hover:bg-black/40 backdrop-blur-sm"
                onClick={togglePlayPause}
              >
                {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
              </Button>
            )}
          </div>
          
          {/* Content overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <h3 className="font-bold text-lg mb-1 drop-shadow-lg">{genre.name}</h3>
            {genre.description && (
              <p className="text-sm text-gray-200 drop-shadow-md line-clamp-2 mb-2">
                {genre.description}
              </p>
            )}
            {genre.sample_prompt && (
              <p className="text-xs text-gray-300 drop-shadow-md italic line-clamp-1">
                "{genre.sample_prompt.substring(0, 60)}..."
              </p>
            )}
          </div>
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
