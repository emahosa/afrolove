import { useState, useRef, useEffect } from 'react';
import { motion } from "framer-motion";
import { GenreTemplate } from '@/hooks/use-genre-templates';
import { useNavigate } from 'react-router-dom';

interface GenreTemplateCardProps {
  template: GenreTemplate;
  index: number;
}

export const GenreTemplateCard = ({ template, index }: GenreTemplateCardProps) => {
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="bg-white/5 rounded-lg overflow-hidden group"
    >
      <div className="relative h-40">
        <img
          src={template.cover_image_url || '/placeholder.svg'}
          alt={template.template_name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 p-3">
          <h3 className="font-bold text-white text-lg">{template.template_name}</h3>
          <p className="text-gray-300 text-sm">{template.genres?.name || "Template"}</p>
        </div>
      </div>
      <div className="p-3 bg-[#1a0b2e]">
        <div className="flex gap-2">
          <button
            onClick={handleAudioPlay}
            className="flex-1 bg-white/10 text-white text-sm rounded-md py-2 hover:bg-white/20 transition-colors"
          >
            {isPlaying ? 'Pause' : 'Preview'}
          </button>
          <button
            onClick={handleCreateMusic}
            className="flex-1 bg-purple-600 text-white text-sm rounded-md py-2 hover:bg-purple-700 transition-colors"
          >
            Create Music
          </button>
        </div>
      </div>
    </motion.div>
  );
};
