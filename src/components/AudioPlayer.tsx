
import { useAudioPlayerContext } from '@/contexts/AudioPlayerContext';
import { Button } from '@/components/ui/button';
import { Play, Pause, X } from 'lucide-react';

const AudioPlayer = () => {
  const { currentTrack, isPlaying, togglePlayPause, closePlayer, showPlayer } = useAudioPlayerContext();

  console.log('🎼 AudioPlayer render. State:', { showPlayer, isPlaying, currentTrack: currentTrack?.title });

  if (!showPlayer || !currentTrack) {
    console.log('👻 AudioPlayer not rendered (showPlayer or currentTrack is falsy).');
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-background border-t shadow-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button size="icon" onClick={togglePlayPause}>
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <div>
            <p className="font-semibold">{currentTrack.title}</p>
            <p className="text-sm text-muted-foreground">Now Playing</p>
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={closePlayer}>
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default AudioPlayer;
