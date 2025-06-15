
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { Play, Pause, Music, Loader2 } from 'lucide-react';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { useLocation } from 'react-router-dom';
import React from 'react';

export const AudioPlayer = () => {
  const { currentTrack, isPlaying, progress, duration, togglePlayPause, isLoading, seek } = useAudioPlayer();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const progressContainerRef = React.useRef<HTMLDivElement>(null);

  const formatTime = (time: number) => {
    if (isNaN(time) || time <= 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || !progressContainerRef.current) return;

    const rect = progressContainerRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(1, clickX / width));
    const seekTime = duration * percentage;
    seek(seekTime);
  };

  if (isAdminRoute || !currentTrack) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-md text-white p-3 border-t border-gray-700 shadow-lg z-50 animate-slide-in-up"
      style={{ animation: 'slide-in-up 0.5s ease-out' }}
    >
      <style>{`
        @keyframes slide-in-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
      <div className="flex items-center gap-4 max-w-screen-2xl mx-auto">
        
        <div className="flex items-center gap-3 w-64 flex-shrink-0">
          <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center rounded-md flex-shrink-0">
            {currentTrack.artwork_url ? (
              <img src={currentTrack.artwork_url} alt={currentTrack.title} className="w-full h-full object-cover rounded-md" />
            ) : (
              isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Music className="h-6 w-6" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate text-white">{currentTrack.title}</p>
            <p className="text-sm text-gray-400">{currentTrack.artist || 'AI Generated'}</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-2 max-w-2xl">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={togglePlayPause} 
            className="rounded-full h-10 w-10 bg-white/10 hover:bg-white/20"
            disabled={isLoading || !currentTrack}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
          </Button>

          <div className="w-full flex items-center gap-2">
            <span className="text-xs w-10 text-right text-gray-300">{formatTime(progress)}</span>
            <div 
              ref={progressContainerRef} 
              onClick={handleSeek} 
              className="w-full h-4 flex items-center cursor-pointer group"
            >
              <Progress 
                value={duration > 0 ? (progress / duration) * 100 : 0} 
                className="h-1.5 bg-gray-600 group-hover:[&>div]:bg-pink-500 [&>div]:bg-white transition-all duration-200"
              />
            </div>
            <span className="text-xs w-10 text-gray-300">{formatTime(duration)}</span>
          </div>
        </div>
        
        <div className="w-64 flex-shrink-0"></div>

      </div>
    </div>
  );
};
