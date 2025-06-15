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
  seek: (time: number) => void;
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

    const handleTimeUpdate = () => setProgress(audio.currentTime);
    
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
      let errorMessage = "An unknown error occurred while playing audio.";
      
      if (audioEl.error) {
        console.error('🎵 Audio element error details:', {
          code: audioEl.error.code,
          message: audioEl.error.message,
        });
        
        switch(audioEl.error.code) {
          case 1: errorMessage = 'Audio playback was aborted.'; break;
          case 2: errorMessage = 'A network error occurred. This could be a CORS issue with the audio source or the proxy.'; break;
          case 3: errorMessage = 'The audio is corrupted or in an unsupported format.'; break;
          case 4: errorMessage = 'The audio resource is not supported or unavailable. Check if the URL is correct and the proxy is working.'; break;
        }
      }
      
      toast.error(errorMessage, { description: `Track: ${currentTrack?.title || 'Unknown'}` });
      setIsLoading(false);
      setIsPlaying(false);
    };

    const handleCanPlay = () => {
      console.log('🎵 Audio is ready to be played (canplay).');
      setIsLoading(false);
      // We don't auto-play here anymore. Playback is initiated by user via togglePlayPause or playTrack.
    };
    
    const handleLoadStart = () => {
      console.log('🎵 Audio loading started (loadstart).');
      setIsLoading(true);
    };

    const handlePlaying = () => {
        console.log('🎵 Audio is now playing.');
        setIsPlaying(true);
        setIsLoading(false);
    };

    const handlePause = () => {
        console.log('🎵 Audio is paused.');
        setIsPlaying(false);
    };

    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadstart', handleLoadStart);
    // loadeddata is not strictly needed with this new flow
    
    return () => {
      if (audio) {
        audio.removeEventListener('playing', handlePlaying);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('durationchange', handleDurationChange);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('loadstart', handleLoadStart);
      }
    };
  }, []); // Empty dependency array is correct here

  const seek = (time: number) => {
    if (audioRef.current && isFinite(time)) {
      console.log(`🎵 Seeking to ${time.toFixed(2)}s`);
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const playTrack = (track: Track) => {
    console.log(`🎵 playTrack called for "${track.title}".`);
    
    if (currentTrack?.id === track.id) {
      console.log('🎵 Same track detected, toggling play/pause.');
      togglePlayPause();
      return;
    }
  
    console.log(`🎵 New track selected. Preparing to load and play "${track.title}".`);
    setCurrentTrack(track); 
    setIsLoading(true);
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    
    if (audioRef.current) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      if (!supabaseUrl) {
        toast.error("Player configuration error. Cannot find Supabase URL.");
        console.error("VITE_SUPABASE_URL environment variable not set.");
        setIsLoading(false);
        return;
      }
      
      const audioUrl = track.audio_url;

      let finalUrl;
      // URLs from Google Storage are CORS-enabled, no need to proxy them.
      if (audioUrl.startsWith('blob:') || audioUrl.startsWith('data:') || audioUrl.includes('storage.googleapis.com')) {
          finalUrl = audioUrl;
          console.log(`🎵 Setting audio source to direct URL: ${finalUrl}`);
      } else {
          finalUrl = `${supabaseUrl}/functions/v1/suno-proxy?url=${encodeURIComponent(audioUrl)}`;
          console.log(`🎵 Setting audio source to proxy: ${finalUrl}`);
      }
      audioRef.current.src = finalUrl;

      // This is a direct response to a user click, so we can call play()
      const playPromise = audioRef.current.play();

      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('🎵 Failed to auto-play new track. The audio element will raise a more specific error event.', error);
          // The 'error' event listener on the audio element will handle the UI feedback.
          setIsPlaying(false); 
        });
      }

    } else {
      console.error("🎵 Audio element ref is not available!");
      toast.error("Audio player not initialized.");
      setIsLoading(false);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current || !audioRef.current.src) {
      console.log("🎵 Cannot toggle: no audio element or src.");
      return;
    }

    console.log(`🎵 togglePlayPause called. isPlaying: ${isPlaying}`);
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("🎵 Error playing audio:", error);
          toast.error("Could not play audio. There might be a network issue or the source is invalid.");
          setIsPlaying(false);
        });
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
    seek,
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
