
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Music, Loader2 } from 'lucide-react';
import { GenreTemplate } from '@/hooks/use-genre-templates';
import { useNavigate } from 'react-router-dom';
import { useAudioPlayer, Track } from '@/contexts/AudioPlayerContext';

interface GenreTemplateCardProps {
  template: GenreTemplate;
}

export const GenreTemplateCard = ({ template }: GenreTemplateCardProps) => {
  const navigate = useNavigate();
  const { playTrack, currentTrack, isPlaying, isLoading } = useAudioPlayer();

  const isCurrentTrack = currentTrack?.id === template.id;
  const isThisPlaying = isCurrentTrack && isPlaying;
  const isThisLoading = isCurrentTrack && isLoading;

  const handleAudioPlay = () => {
    if (!template.audio_url) return;

    const track: Track = {
      id: template.id,
      title: template.template_name,
      audio_url: template.audio_url,
      artwork_url: template.cover_image_url,
      artist: template.genres?.name,
    };
    playTrack(track);
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
              disabled={isThisLoading}
              className="flex-1 bg-transparent border-white/30 hover:bg-white/10 text-white"
            >
              {isThisLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : isThisPlaying ? (
                <Pause className="h-4 w-4 mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isThisLoading ? 'Loading...' : isThisPlaying ? 'Pause' : 'Preview'}
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
