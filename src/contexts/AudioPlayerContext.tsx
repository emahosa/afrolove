
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
  playTrack: (track: Track) => void;
  togglePlayPause: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const AudioPlayerProvider = ({ children }: { children: ReactNode }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setProgress(audio.currentTime);
    };
    
    const handleDurationChange = () => {
      setDuration(audio.duration || 0);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };
    
    const handleError = (e: any) => {
      console.error('Audio error:', e);
      if (currentTrack) {
        toast.error(`Failed to load: ${currentTrack.title}`);
      }
      setIsPlaying(false);
    };

    const handleCanPlay = () => {
      console.log('Audio can play, starting playback...');
      audio.play()
        .then(() => {
          console.log('Audio started playing successfully');
          setIsPlaying(true);
        })
        .catch(e => {
          console.error("Error playing audio:", e);
          toast.error("Could not play audio.");
          setIsPlaying(false);
        });
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.pause();
      audioRef.current = null;
    };
  }, [currentTrack]);

  const playTrack = (track: Track) => {
    console.log('🎵 PlayTrack called with:', track);
    
    if (currentTrack?.id === track.id) {
      console.log('Same track, toggling play/pause');
      togglePlayPause();
    } else {
      console.log('New track, loading:', track.audio_url);
      setCurrentTrack(track);
      setProgress(0);
      setDuration(0);
      
      if (audioRef.current) {
        audioRef.current.src = track.audio_url;
        audioRef.current.load(); // Force reload
      }
    }
  };

  const togglePlayPause = () => {
    console.log('🎵 TogglePlayPause called, isPlaying:', isPlaying);
    
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        console.log('Audio paused');
      } else {
        if (audioRef.current.src) {
          audioRef.current.play()
            .then(() => {
              setIsPlaying(true);
              console.log('Audio resumed');
            })
            .catch(e => {
              console.error("Error resuming audio:", e);
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
