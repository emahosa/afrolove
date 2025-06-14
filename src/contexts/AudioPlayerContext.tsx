
import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';

export interface PlayingRequest {
  id: string;
  title: string;
  type?: 'suno' | 'custom';
}

interface AudioPlayerContextType {
  currentTrack: PlayingRequest | null;
  isPlaying: boolean;
  playTrack: (track: PlayingRequest) => void;
  togglePlayPause: () => void;
  closePlayer: () => void;
  showPlayer: boolean;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const AudioPlayerProvider = ({ children }: { children: ReactNode }) => {
  const [currentTrack, setCurrentTrack] = useState<PlayingRequest | null>(() => {
    try {
      const saved = sessionStorage.getItem('audioPlayerTrack');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayer, setShowPlayer] = useState<boolean>(() => {
    try {
      const saved = sessionStorage.getItem('audioPlayerShow');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (currentTrack) {
        sessionStorage.setItem('audioPlayerTrack', JSON.stringify(currentTrack));
      } else {
        sessionStorage.removeItem('audioPlayerTrack');
      }
      sessionStorage.setItem('audioPlayerShow', JSON.stringify(showPlayer));
    } catch (error) {
      console.error("Failed to save audio player state to sessionStorage", error);
    }
  }, [currentTrack, showPlayer]);

  const playTrack = useCallback((track: PlayingRequest) => {
    console.log('🎵 AudioPlayerContext: playTrack called with:', track);
    
    // Always show the player when a track is played
    setShowPlayer(true);
    
    if (currentTrack?.id !== track.id) {
      // New track - set it and start playing
      setCurrentTrack(track);
      setIsPlaying(true);
      console.log('🎵 AudioPlayerContext: New track set, player should show');
    } else {
      // Same track - just toggle play/pause
      setIsPlaying(prev => !prev);
      console.log('🎵 AudioPlayerContext: Same track, toggling play/pause');
    }
  }, [currentTrack]);

  const togglePlayPause = useCallback(() => {
    if (currentTrack) {
      setIsPlaying(prevIsPlaying => !prevIsPlaying);
    }
  }, [currentTrack]);
  
  const closePlayer = useCallback(() => {
    console.log('🎵 AudioPlayerContext: closePlayer called');
    setShowPlayer(false);
    setIsPlaying(false);
    setCurrentTrack(null);
  }, []);

  const value = {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlayPause,
    closePlayer,
    showPlayer
  };

  console.log('🎵 AudioPlayerContext: Current state:', { currentTrack: currentTrack?.title, isPlaying, showPlayer });

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayerContext = () => {
  const context = useContext(AudioPlayerContext);
  if (context === undefined) {
    throw new Error('useAudioPlayerContext must be used within an AudioPlayerProvider');
  }
  return context;
};
