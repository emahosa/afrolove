
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, Play, Pause, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useSunoGeneration } from "@/hooks/use-suno-generation";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface GenreTemplate {
  id: string;
  template_name: string;
  admin_prompt: string;
  user_prompt_guide?: string | null;
  audio_url?: string | null;
  cover_image_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  created_by?: string | null;
  genre_id: string;
  genres?: {
    name: string;
    description?: string | null;
  };
}

interface GenreTemplateCardProps {
  template: GenreTemplate;
}

export const GenreTemplateCard = ({ template }: GenreTemplateCardProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { generateSong } = useSunoGeneration();
  const { user, updateUserCredits } = useAuth();

  // Cleanup audio when component unmounts or template changes
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [template.id]);

  const handleAudioPlay = async () => {
    if (!template.audio_url) return;

    try {
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      if (isPlaying) {
        // Stop playing
        setIsPlaying(false);
        return;
      }

      setIsLoading(true);
      
      // Create new audio instance
      const audio = new Audio(template.audio_url);
      audioRef.current = audio;

      // Set up audio event listeners
      audio.addEventListener('loadstart', () => {
        setIsLoading(true);
      });

      audio.addEventListener('canplay', () => {
        setIsLoading(false);
        setIsPlaying(true);
      });

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setIsLoading(false);
      });

      audio.addEventListener('error', () => {
        setIsLoading(false);
        setIsPlaying(false);
        toast.error('Failed to load audio preview');
      });

      // Start playing
      await audio.play();
      
    } catch (error) {
      console.error('Audio playback error:', error);
      setIsLoading(false);
      setIsPlaying(false);
      toast.error('Failed to play audio preview');
    }
  };

  const handleGenerate = async () => {
    if (!user) {
      toast.error("Please log in to generate songs");
      return;
    }

    if ((user.credits || 0) < 20) {
      toast.error("You need at least 20 credits to generate a song");
      return;
    }

    setIsGenerating(true);
    
    try {
      const result = await generateSong({
        prompt: template.admin_prompt,
        title: `${template.template_name} Song`,
        instrumental: false,
        customMode: false,
        model: 'V3_5'
      });
      
      if (result) {
        updateUserCredits(-20);
        toast.success(`Song generation started using ${template.template_name} template!`);
      }
    } catch (error) {
      console.error('Generation failed:', error);
      toast.error("Failed to start song generation. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
      <div className="relative">
        {template.cover_image_url ? (
          <div className="relative">
            <img
              src={template.cover_image_url}
              alt={template.template_name}
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-violet-600/20 to-purple-600/20 flex items-center justify-center">
            <Music className="h-16 w-16 text-violet-400/60" />
          </div>
        )}
        
        {template.audio_url && (
          <Button
            size="sm"
            variant="secondary"
            className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white border-none backdrop-blur-sm"
            onClick={handleAudioPlay}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
      
      <CardHeader className="pb-3">
        <CardTitle className="text-xl text-white">{template.template_name}</CardTitle>
        {template.genres && (
          <CardDescription className="text-slate-300">
            <span className="text-violet-400 font-medium">Genre:</span> {template.genres.name}
            {template.genres.description && (
              <span className="block text-sm text-slate-400 mt-1">{template.genres.description}</span>
            )}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4 pt-0">
        {template.user_prompt_guide && (
          <div className="text-sm text-slate-300 bg-slate-800/50 p-3 rounded-lg border border-slate-700">
            <p className="font-medium mb-2 text-violet-400">Style Guide:</p>
            <p>{template.user_prompt_guide}</p>
          </div>
        )}
        
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !user || (user.credits || 0) < 20}
          className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold py-3 transition-all duration-200 transform hover:scale-[1.02]"
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2" />
              Generating...
            </>
          ) : (
            <>
              <Music className="mr-2 h-4 w-4" />
              Generate Song (20 Credits)
            </>
          )}
        </Button>
        
        {user && (user.credits || 0) < 20 && (
          <p className="text-sm text-red-400 text-center bg-red-950/20 p-2 rounded border border-red-800/30">
            Not enough credits. You need 20 credits to generate a song.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
