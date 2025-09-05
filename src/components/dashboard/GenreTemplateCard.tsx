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
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="bg-[#1a0b2e] p-6 rounded-2xl shadow-lg hover:scale-105 transition-transform"
    >
      <h3 className="text-xl font-semibold">{template.template_name}</h3>
      <p className="text-sm text-gray-400">{template.genres?.name || "Template"}</p>
      <div className="flex gap-3 mt-4">
        <button
          onClick={handleAudioPlay}
          className="border border-gray-500 text-gray-300 rounded-xl px-4 py-2 hover:bg-white/10 transition"
        >
          {isPlaying ? 'Pause' : 'Preview'}
        </button>
        <button
          onClick={handleCreateMusic}
          className="bg-purple-600 hover:bg-purple-700 rounded-xl px-4 py-2 text-white font-semibold transition"
        >
          Create Music
        </button>
      </div>
    </motion.div>
  );
};
