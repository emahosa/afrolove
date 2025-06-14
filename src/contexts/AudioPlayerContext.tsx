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
    console.log('🎧 AudioPlayerProvider mounted. Creating audio element.');
    audioRef.current = new Audio();
    const audio = audioRef.current;

    const handleEnded = () => {
      console.log('⏹️ Audio ended.');
      setIsPlaying(false);
    };
    const handlePlay = () => {
      console.log('▶️ Audio play event fired.');
      setIsPlaying(true);
    };
    const handlePause = () => {
      console.log('⏸️ Audio pause event fired.');
      setIsPlaying(false);
    };
    const handleError = (e: Event) => {
      console.error('🔊 Audio Element Error:', e);
    }

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      console.log('🧹 Cleaning up audio element and listeners.');
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', handleEnded);
        audioRef.current.removeEventListener('play', handlePlay);
        audioRef.current.removeEventListener('pause', handlePause);
        audioRef.current.removeEventListener('error', handleError);
        audioRef.current.pause();
      }
      audioRef.current = null;
    };
  }, []);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) {
      console.log('⏯️ Toggle failed: audioRef not ready.');
      return;
    }
    if (!audioRef.current.src) {
        console.log('⏯️ Toggle failed: no src.');
        return;
    }

    if (audioRef.current.paused) {
      console.log('⏯️ Toggle: Audio is paused, calling play().');
      audioRef.current.play().catch(e => console.error("Error playing audio on toggle:", e));
    } else {
      console.log('⏯️ Toggle: Audio is playing, calling pause().');
      audioRef.current.pause();
    }
  }, []);

  const playTrack = useCallback((track: PlayingRequest) => {
    if (!audioRef.current) {
        console.log('🎵 playTrack failed: audioRef not ready.');
        return;
    }
    
    console.log('🎵 playTrack called with:', track);

    if (currentTrack?.id === track.id) {
      console.log('🎵 It\'s the same track, toggling play/pause.');
      togglePlayPause();
    } else {
      console.log('🎵 It\'s a new track. Setting up and playing.');
      setCurrentTrack(track);
      setShowPlayer(true);
      audioRef.current.src = track.audio_url;
      audioRef.current.play().catch(e => {
          console.error("Error playing new track:", e);
          setShowPlayer(false);
          setCurrentTrack(null);
          setIsPlaying(false);
      });
    }
  }, [currentTrack, togglePlayPause]);
  
  const closePlayer = useCallback(() => {
    console.log('❌ Closing player.');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setShowPlayer(false);
    setIsPlaying(false);
    setCurrentTrack(null);
  }, []);

  console.log('🔄 AudioPlayerContext render. State:', { showPlayer, isPlaying, currentTrack: currentTrack?.title });
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
