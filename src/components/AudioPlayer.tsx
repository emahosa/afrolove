
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { Play, Pause, Music } from 'lucide-react';
import { Progress } from './ui/progress';
import { Button } from './ui/button';

export const AudioPlayer = () => {
  const { currentTrack, isPlaying, progress, duration, togglePlayPause } = useAudioPlayer();

  console.log('🎵 AudioPlayer: ALWAYS RENDERING - currentTrack:', currentTrack?.title || 'null', 'isPlaying:', isPlaying);

  const formatTime = (time: number) => {
    if (isNaN(time) || time === 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // ALWAYS RENDER - NO MORE CONDITIONAL HIDING
  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-red-500 text-white p-4 border-t-4 border-yellow-400 shadow-2xl"
      style={{ zIndex: 9999, backgroundColor: '#ff0000', minHeight: '80px' }}
    >
      <div className="bg-blue-500 p-2 rounded">
        <div className="text-yellow-300 font-bold text-lg mb-2">
          AUDIO PLAYER - ALWAYS VISIBLE
        </div>
        
        {currentTrack ? (
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center rounded-md flex-shrink-0">
              <Music className="h-6 w-6" />
            </div>

            <div className="flex-1 flex items-center gap-4 min-w-0">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={togglePlayPause} 
                className="rounded-full h-10 w-10 bg-white/10 hover:bg-white/20 flex-shrink-0"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
              </Button>

              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate text-white">{currentTrack.title}</p>
                <p className="text-sm text-gray-200">{currentTrack.artist || 'AI Generated'}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs w-10 text-right text-gray-200">{formatTime(progress)}</span>
                  <div className="flex-1">
                    <Progress 
                      value={(progress / duration) * 100 || 0} 
                      className="h-2 bg-gray-700"
                    />
                  </div>
                  <span className="text-xs w-10 text-gray-200">{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-white font-bold">NO TRACK LOADED</div>
            <div className="text-yellow-200">Click play on any song to start</div>
          </div>
        )}
      </div>
    </div>
  );
};
