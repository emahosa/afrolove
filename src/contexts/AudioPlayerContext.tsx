
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
  pauseTrack: () => void;
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
      duration: duration.toFixed(2),
      audioUrl: currentTrack?.audio_url || 'null'
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
      let errorMessage = "Failed to play audio.";
      
      if (audioEl.error) {
        console.error('🎵 Audio element error details:', {
          code: audioEl.error.code,
          message: audioEl.error.message,
          src: audioEl.src
        });
        
        switch(audioEl.error.code) {
          case 1: errorMessage = 'Audio playback was aborted.'; break;
          case 2: errorMessage = 'Network error occurred while loading audio.'; break;
          case 3: errorMessage = 'The audio file is corrupted or in an unsupported format.'; break;
          case 4: errorMessage = 'The audio source is not available. Please try again.'; break;
        }
      }
      
      toast.error(errorMessage, { description: `Track: ${currentTrack?.title || 'Unknown'}` });
      setIsLoading(false);
      setIsPlaying(false);
    };

    const handleCanPlay = () => {
      console.log('🎵 Audio is ready to be played (canplay).');
      setIsLoading(false);
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

    const handleLoadedData = () => {
      console.log('🎵 Audio data loaded successfully');
      setIsLoading(false);
    };

    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('loadeddata', handleLoadedData);
    
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
        audio.removeEventListener('loadeddata', handleLoadedData);
      }
    };
  }, [currentTrack]);

  const seek = (time: number) => {
    if (audioRef.current && isFinite(time)) {
      console.log(`🎵 Seeking to ${time.toFixed(2)}s`);
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const pauseTrack = () => {
    if (audioRef.current && audioRef.current.src) {
      audioRef.current.pause();
    }
  };

  const playTrack = (track: Track) => {
    console.log(`🎵 playTrack called for "${track.title}".`);
    console.log('🎵 Track data:', {
      id: track.id,
      title: track.title,
      audio_url: track.audio_url,
      url_valid: !!track.audio_url && track.audio_url.trim() !== ''
    });
    
    if (currentTrack?.id === track.id) {
      console.log('🎵 Same track detected, toggling play/pause.');
      togglePlayPause();
      return;
    }

    // Validate audio URL
    if (!track.audio_url || track.audio_url.trim() === '') {
      console.error('🎵 Invalid audio URL:', track.audio_url);
      toast.error('Audio file not available for this track');
      return;
    }
  
    console.log(`🎵 New track selected. Preparing to load and play "${track.title}".`);
    setCurrentTrack(track); 
    setIsLoading(true);
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    
    if (audioRef.current) {
      // Stop current audio if playing
      audioRef.current.pause();
      audioRef.current.currentTime = 0;

      const audioUrl = track.audio_url;
      let finalUrl = audioUrl;

      // Handle different URL types
      if (audioUrl.includes('cdn1.suno.ai') || audioUrl.includes('suno.ai')) {
        // Suno CDN URLs need proxy
        const supabaseUrl = 'https://bswfiynuvjvoaoyfdrso.supabase.co';
        finalUrl = `${supabaseUrl}/functions/v1/suno-proxy?url=${encodeURIComponent(audioUrl)}`;
        console.log(`🎵 Using Suno proxy for URL: ${finalUrl}`);
      } else if (
        audioUrl.startsWith('blob:') || 
        audioUrl.startsWith('data:') || 
        audioUrl.includes('storage.googleapis.com') ||
        audioUrl.includes('apiboxfiles.erweima.ai')
      ) {
        // Direct URLs that don't need proxy
        finalUrl = audioUrl;
        console.log(`🎵 Using direct URL: ${finalUrl}`);
      } else if (audioUrl.startsWith('http')) {
        // For other HTTP URLs that might require CORS headers, use the proxy as a fallback.
        const supabaseUrl = 'https://bswfiynuvjvoaoyfdrso.supabase.co';
        finalUrl = `${supabaseUrl}/functions/v1/suno-proxy?url=${encodeURIComponent(audioUrl)}`;
        console.log(`🎵 Using proxy as fallback for external URL: ${finalUrl}`);
      }

      console.log(`🎵 Setting audio source: ${finalUrl}`);
      audioRef.current.src = finalUrl;

      // Preload the audio
      audioRef.current.load();

      // Auto-play the track
      const playPromise = audioRef.current.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('🎵 Audio playback started successfully');
          })
          .catch(error => {
            console.error('🎵 Failed to auto-play track:', error);
            setIsLoading(false);
            toast.error('Failed to play audio. Click play button to try again.');
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
          toast.error("Could not play audio. Please check your connection and try again.");
          setIsPlaying(false);
          setIsLoading(false);
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
    pauseTrack,
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
