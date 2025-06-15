
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
    console.log('🎵 AudioPlayerContext: State updated - track:', currentTrack?.title || 'null', 'playing:', isPlaying, 'loading:', isLoading);
  }, [currentTrack, isPlaying, isLoading]);

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
      setDuration(audio.duration || 0);
      console.log('🎵 Duration loaded:', audio.duration);
    };
    
    const handleEnded = () => {
      console.log('🎵 Audio ended');
      setIsPlaying(false);
      setProgress(0);
    };
    
    const handleError = (e: any) => {
      console.error('🎵 Audio error:', e);
      if (currentTrack) {
        toast.error(`Failed to load: ${currentTrack.title}`);
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
    console.log(`🎵 playTrack called for "${track.title}". Current track is "${currentTrack?.title}".`);
    
    if (currentTrack?.id === track.id) {
      console.log('🎵 Same track detected, toggling play/pause.');
      togglePlayPause();
      return;
    }
  
    console.log(`🎵 New track selected. Loading "${track.title}".`);
    setCurrentTrack(track);
    setIsLoading(true);
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    
    if (audioRef.current) {
      audioRef.current.src = track.audio_url;
      audioRef.current.load();
    }
  };

  const togglePlayPause = () => {
    console.log('🎵 TogglePlayPause called, isPlaying:', isPlaying);
    
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        console.log('🎵 Audio paused');
      } else {
        if (audioRef.current.src) {
          audioRef.current.play()
            .then(() => {
              setIsPlaying(true);
              console.log('🎵 Audio resumed');
            })
            .catch(e => {
              console.error("🎵 Error resuming audio:", e);
              toast.error("Could not resume audio.");
            });
        }
      }
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
