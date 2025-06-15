
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { Play, Pause, Music, Loader2 } from 'lucide-react';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { useLocation } from 'react-router-dom';

export const AudioPlayer = () => {
  const { currentTrack, isPlaying, progress, duration, togglePlayPause, isLoading } = useAudioPlayer();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  const formatTime = (time: number) => {
    if (isNaN(time) || time === 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isAdminRoute || !currentTrack) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 border-t border-gray-700 shadow-lg z-50"
    >
      <div className="flex items-center gap-4 max-w-7xl mx-auto">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center rounded-md flex-shrink-0">
          {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Music className="h-6 w-6" />}
        </div>

        <div className="flex-1 flex items-center gap-4 min-w-0">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={togglePlayPause} 
            className="rounded-full h-10 w-10 bg-white/10 hover:bg-white/20 flex-shrink-0"
            disabled={isLoading}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
          </Button>

          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate text-white">{currentTrack.title}</p>
            {isLoading ? (
              <p className="text-sm text-gray-400">Loading...</p>
            ) : (
              <p className="text-sm text-gray-400">{currentTrack.artist || 'AI Generated'}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs w-10 text-right text-gray-300">{formatTime(progress)}</span>
              <div className="flex-1">
                <Progress 
                  value={(progress / duration) * 100 || 0} 
                  className="h-2 bg-gray-700 [&>div]:bg-white"
                />
              </div>
              <span className="text-xs w-10 text-gray-300">{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
