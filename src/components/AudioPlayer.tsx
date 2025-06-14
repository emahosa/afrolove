
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { Play, Pause, Music } from 'lucide-react';
import { Progress } from './ui/progress';
import { Button } from './ui/button';

export const AudioPlayer = () => {
  const { currentTrack, isPlaying, progress, duration, togglePlayPause } = useAudioPlayer();

  if (!currentTrack) {
    return null;
  }
  
  const formatTime = (time: number) => {
    if (isNaN(time) || time === 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 border-t border-gray-700 flex items-center gap-4 z-50 animate-fade-in">
      <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center rounded-md">
        <Music className="h-6 w-6" />
      </div>

      <div className="flex-1 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={togglePlayPause} className="rounded-full h-10 w-10 bg-white/10 hover:bg-white/20">
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
        </Button>

        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{currentTrack.title}</p>
          <p className="text-sm text-gray-400">{currentTrack.artist || 'AI Artist'}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs w-10 text-right">{formatTime(progress)}</span>
            <Progress value={(progress / duration) * 100 || 0} className="h-1 bg-gray-700" />
            <span className="text-xs w-10">{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
