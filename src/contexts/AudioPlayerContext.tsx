
import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

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
  const [currentTrack, setCurrentTrack] = useState<PlayingRequest | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);

  const playTrack = useCallback((track: PlayingRequest) => {
    if (currentTrack?.id !== track.id) {
      setCurrentTrack(track);
    }
    setIsPlaying(true);
    if (!showPlayer) {
      setShowPlayer(true);
    }
  }, [currentTrack, showPlayer]);

  const togglePlayPause = useCallback(() => {
    if (currentTrack) {
      setIsPlaying(prevIsPlaying => !prevIsPlaying);
    }
  }, [currentTrack]);
  
  const closePlayer = useCallback(() => {
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
