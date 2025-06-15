import { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

export interface Track {
  id: string;
  title: string;
  audio_url: string;
  artist?: string;
  artwork_url?: string;
}

interface AudioPlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  isLoading: boolean;
  playTrack: (track: Track) => void;
  togglePlayPause: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const AudioPlayerProvider = ({ children }: { children: ReactNode }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Debug state changes
  useEffect(() => {
    console.log('🎵 CTX STATE UPDATE:', { 
      track: currentTrack?.title || 'null', 
      isPlaying, 
      isLoading,
      progress: progress.toFixed(2),
      duration: duration.toFixed(2)
    });
  }, [currentTrack, isPlaying, isLoading, progress, duration]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      console.log('🎵 Audio element created');
    }
    
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setProgress(audio.currentTime);
    };
    
    const handleDurationChange = () => {
      if (audio.duration && audio.duration !== Infinity) {
        setDuration(audio.duration);
        console.log('🎵 Duration loaded:', audio.duration);
      }
    };
    
    const handleEnded = () => {
      console.log('🎵 Audio ended');
      setIsPlaying(false);
      setProgress(0);
    };
    
    const handleError = (e: Event) => {
      console.error('🎵 Audio error event:', e);
      const audioEl = e.target as HTMLAudioElement;
      if (audioEl.error) {
        console.error('🎵 Audio element error details:', {
          code: audioEl.error.code,
          message: audioEl.error.message,
        });
        
        let errorMessage = `Failed to load audio.`;
        switch(audioEl.error.code) {
          case 1: // MEDIA_ERR_ABORTED
            errorMessage = 'Audio playback was aborted.';
            break;
          case 2: // MEDIA_ERR_NETWORK
            errorMessage = 'A network error caused the audio to fail to load. This might be a CORS issue.';
            break;
          case 3: // MEDIA_ERR_DECODE
            errorMessage = 'The audio is corrupted or in an unsupported format.';
            break;
          case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
            errorMessage = 'The audio format is not supported or the resource is unavailable (check CORS).';
            break;
          default:
             errorMessage = 'An unknown error occurred with the audio player.';
        }
        if (currentTrack) {
          toast.error(`${errorMessage}`, { description: `Track: ${currentTrack.title}`});
        } else {
          toast.error(errorMessage);
        }
      } else {
        toast.error('An unknown audio error occurred.');
      }
      
      setIsPlaying(false);
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      console.log('🎵 Audio can play, starting playback...');
      setIsLoading(false);
      audio.play()
        .then(() => {
          console.log('🎵 Audio started playing successfully');
          setIsPlaying(true);
        })
        .catch(e => {
          console.error("🎵 Error playing audio:", e);
          toast.error("Could not play audio.");
          setIsPlaying(false);
        });
    };

    const handleLoadStart = () => {
      console.log('🎵 Audio loading started');
    };

    const handleLoadedData = () => {
      console.log('🎵 Audio data loaded');
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('loadeddata', handleLoadedData);

    return () => {
      if (audio) {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('durationchange', handleDurationChange);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('loadstart', handleLoadStart);
        audio.removeEventListener('loadeddata', handleLoadedData);
      }
    };
  }, []); // Empty dependency array is correct here

  const playTrack = (track: Track) => {
    console.log(`🎵 playTrack called for "${track.title}".`);
    
    if (currentTrack?.id === track.id) {
      console.log('🎵 Same track detected, toggling play/pause.');
      togglePlayPause();
      return;
    }
  
    console.log(`🎵 New track selected. Setting state and loading "${track.title}".`);
    // Re-ordered state updates to prevent race conditions
    setCurrentTrack(track); 
    setIsLoading(true);
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    
    if (audioRef.current) {
      console.log(`🎵 Setting audio source to: ${track.audio_url}`);
      audioRef.current.src = track.audio_url;
      audioRef.current.load(); // Triggers 'loadstart', 'durationchange', 'loadeddata', 'canplay' etc.
    } else {
      console.error("🎵 Audio element ref is not available!");
      toast.error("Audio player not initialized.");
      setIsLoading(false);
    }
  };

  const togglePlayPause = () => {
    console.log(`🎵 togglePlayPause called. isPlaying: ${isPlaying}, src: ${audioRef.current?.src}`);
    
    if (!audioRef.current || !audioRef.current.src) {
      console.log("🎵 Cannot toggle: no audio element or src.");
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      console.log('🎵 Audio paused');
    } else {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          console.log('🎵 Audio resumed/played');
        })
        .catch(e => {
          console.error("🎵 Error playing audio:", e);
          toast.error("Could not play audio.");
          setIsPlaying(false);
        });
    }
  };

  const value = {
    currentTrack,
    isPlaying,
    progress,
    duration,
    isLoading,
    playTrack,
    togglePlayPause,
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (context === undefined) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
};
