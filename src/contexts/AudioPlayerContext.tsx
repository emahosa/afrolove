
import { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect } from 'react';

export interface PlayingRequest {
  id: string;
  title: string;
  audio_url: string;
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
  const [showPlayer, setShowPlayer] = useState<boolean>(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create the audio element on the client
    audioRef.current = new Audio();
    const audio = audioRef.current;

    const handleEnded = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  const playTrack = useCallback((track: PlayingRequest) => {
    if (audioRef.current) {
      if (currentTrack?.id === track.id) {
        // If it's the same track, just toggle play/pause
        togglePlayPause();
      } else {
        // New track
        setCurrentTrack(track);
        setShowPlayer(true);
        audioRef.current.src = track.audio_url;
        audioRef.current.play().catch(e => console.error("Error playing audio:", e));
      }
    }
  }, [currentTrack]);

  const togglePlayPause = useCallback(() => {
    if (audioRef.current?.src) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error("Error playing audio:", e));
      }
    }
  }, [isPlaying]);
  
  const closePlayer = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setShowPlayer(false);
    setIsPlaying(false);
    setCurrentTrack(null);
  }, []);

  const value = { currentTrack, isPlaying, playTrack, togglePlayPause, closePlayer, showPlayer };

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
