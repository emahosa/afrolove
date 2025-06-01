import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Download, X, Volume2, Heart, Share2 } from "lucide-react";
import { Repeat, Repeat1 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BottomAudioPlayerProps {
  requestId: string;
  title: string;
  isVisible: boolean;
  onClose: () => void;
  onDownload?: () => void;
  downloadingAudio?: boolean;
  type?: 'suno' | 'custom'; // Add type to distinguish between song types
}

type RepeatMode = 'none' | 'one' | 'all';

export const BottomAudioPlayer = ({ 
  requestId, 
  title, 
  isVisible,
  onClose,
  onDownload,
  downloadingAudio = false,
  type = 'custom'
}: BottomAudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchAudioUrl = async () => {
    try {
      setLoadingAudio(true);
      console.log('🎵 BottomAudioPlayer: Fetching audio URL for:', { requestId, type, title });

      if (type === 'suno') {
        const { data: songData, error: songError } = await supabase
          .from('songs')
          .select('*')
          .eq('id', requestId)
          .single();

        if (songError || !songData) {
          console.error('❌ Error fetching Suno song:', songError);
          toast.error('Failed to load song');
          return null;
        }

        if (songData.status !== 'completed' || !songData.audio_url) {
          console.log('❌ Song not ready for playback');
          toast.error('Song is not ready for playback');
          return null;
        }

        console.log('✅ Suno audio URL found:', songData.audio_url);
        setAudioUrl(songData.audio_url);
        return songData.audio_url;
      } else {
        // Custom song logic
        const { data: audioData, error: audioError } = await supabase
          .from('custom_song_audio')
          .select('*')
          .eq('request_id', requestId)
          .order('created_at', { ascending: false });

        if (audioError || !audioData || audioData.length === 0) {
          console.error('❌ Error fetching custom audio:', audioError);
          toast.error('No audio file found');
          return null;
        }

        let audioRecord = audioData.find(record => record.is_selected === true);
        if (!audioRecord) {
          audioRecord = audioData[0];
        }

        if (!audioRecord?.audio_url) {
          console.error('❌ No audio URL found');
          toast.error('Audio file URL is missing');
          return null;
        }

        console.log('✅ Custom audio URL found:', audioRecord.audio_url);
        setAudioUrl(audioRecord.audio_url);
        return audioRecord.audio_url;
      }
    } catch (error: any) {
      console.error('💥 Error in fetchAudioUrl:', error);
      toast.error('Failed to load audio: ' + error.message);
      return null;
    } finally {
      setLoadingAudio(false);
    }
  };

  const setupAudioListeners = (audio: HTMLAudioElement) => {
    const handleLoadedMetadata = () => {
      console.log('🎵 Audio metadata loaded, duration:', audio.duration);
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleAudioEnd = () => {
      console.log('🎵 Audio ended, repeat mode:', repeatMode);
      
      if (repeatMode === 'one' || repeatMode === 'all') {
        audio.currentTime = 0;
        audio.play().catch(error => {
          console.error('❌ Error repeating song:', error);
          setIsPlaying(false);
        });
        return;
      }
      
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleAudioError = (e: Event) => {
      console.error('❌ Audio error:', e);
      toast.error('Failed to play audio - file may be corrupted');
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleAudioEnd);
    audio.addEventListener('error', handleAudioError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleAudioEnd);
      audio.removeEventListener('error', handleAudioError);
    };
  };

  const handlePlayPause = async () => {
    try {
      console.log('🎵 BottomAudioPlayer: handlePlayPause called, isPlaying:', isPlaying);

      // If currently playing, pause
      if (isPlaying && audioRef.current) {
        console.log('🎵 Pausing audio');
        audioRef.current.pause();
        setIsPlaying(false);
        return;
      }

      // If we have an audio instance with a source, resume playing
      if (!isPlaying && audioRef.current && audioRef.current.src) {
        console.log('🎵 Resuming audio');
        await audioRef.current.play();
        setIsPlaying(true);
        return;
      }

      // Need to fetch audio URL and create new audio instance
      console.log('🎵 Fetching audio URL for new playback');
      const url = await fetchAudioUrl();
      
      if (!url) {
        console.log('❌ No URL returned from fetchAudioUrl');
        return;
      }

      console.log('🎵 Creating new audio instance with URL:', url);

      // Clean up existing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      // Create new audio instance
      const audio = new Audio(url);
      audioRef.current = audio;

      // Setup event listeners
      setupAudioListeners(audio);

      // Set volume and play
      audio.volume = volume / 100;
      
      console.log('🎵 Starting audio playback');
      await audio.play();
      setIsPlaying(true);
      
      console.log('✅ Audio playback started successfully');

    } catch (error: any) {
      console.error('💥 Error in handlePlayPause:', error);
      toast.error('Failed to play audio: ' + error.message);
      setIsPlaying(false);
    }
  };

  // Auto-start playback when player becomes visible
  useEffect(() => {
    console.log('🎵 BottomAudioPlayer: Player visibility changed:', isVisible);
    
    if (isVisible && requestId) {
      console.log('🎵 Auto-starting playback for new song');
      // Small delay to ensure component is fully mounted
      setTimeout(() => {
        handlePlayPause();
      }, 100);
    }
  }, [isVisible, requestId]);

  const toggleRepeatMode = () => {
    const modes: RepeatMode[] = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    const newMode = modes[nextIndex];
    setRepeatMode(newMode);
    console.log('Repeat mode changed to:', newMode);
    
    const modeNames = {
      'none': 'Repeat Off',
      'all': 'Repeat All',
      'one': 'Repeat One'
    };
    toast.success(`${modeNames[newMode]}`);
  };

  const getRepeatIcon = () => {
    switch (repeatMode) {
      case 'one':
        return <Repeat1 className="h-5 w-5" />;
      case 'all':
        return <Repeat className="h-5 w-5" />;
      default:
        return <Repeat className="h-5 w-5" />;
    }
  };

  const getRepeatButtonClass = () => {
    if (repeatMode === 'none') {
      return "h-10 w-10 rounded-full text-gray-400 hover:text-white";
    }
    return "h-10 w-10 rounded-full text-purple-400 hover:text-purple-300";
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      const newTime = (value[0] / 100) * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🎵 BottomAudioPlayer: Cleaning up audio on unmount');
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  if (!isVisible) return null;

  console.log('🎵 BottomAudioPlayer: Rendering player for:', { title, type, requestId, isPlaying, loadingAudio });

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 shadow-2xl z-50">
      {/* Progress Bar */}
      <div className="px-6 py-2">
        <Slider
          value={[progress]}
          onValueChange={handleSeek}
          max={100}
          step={0.1}
          className="w-full"
        />
      </div>

      {/* Controls Section */}
      <div className="px-6 py-4">
        <div className="flex items-center gap-6">
          {/* Play/Pause Button */}
          <Button
            variant="ghost"
            size="lg"
            onClick={handlePlayPause}
            disabled={loadingAudio}
            className="h-14 w-14 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex-shrink-0"
          >
            {loadingAudio ? (
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-current border-t-transparent" />
            ) : isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 ml-1" />
            )}
          </Button>

          {/* Song Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-white truncate text-lg">{title}</h3>
              <span className="text-sm text-gray-400">by AI Generated</span>
            </div>
            
            {/* Time Display */}
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsLiked(!isLiked)}
              className={`h-10 w-10 rounded-full ${isLiked ? 'text-red-500' : 'text-gray-400'} hover:text-red-500`}
            >
              <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleRepeatMode}
              className={getRepeatButtonClass()}
              title={`Repeat: ${repeatMode}`}
            >
              {getRepeatIcon()}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 rounded-full text-gray-400 hover:text-white"
            >
              <Share2 className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onDownload}
              disabled={downloadingAudio}
              className="h-10 w-10 rounded-full text-gray-400 hover:text-white"
            >
              {downloadingAudio ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent" />
              ) : (
                <Download className="h-5 w-5" />
              )}
            </Button>

            {/* Volume Control */}
            <div className="hidden sm:flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-gray-400" />
              <div className="w-24">
                <Slider
                  value={[volume]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                />
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-10 w-10 rounded-full text-gray-400 hover:text-red-500"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
