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
}

type RepeatMode = 'none' | 'one' | 'all';

export const BottomAudioPlayer = ({ 
  requestId, 
  title, 
  isVisible,
  onClose,
  onDownload,
  downloadingAudio = false
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
    if (audioUrl) return audioUrl;
    
    try {
      setLoadingAudio(true);
      console.log('🎵 BottomAudioPlayer: Fetching audio URL for request:', requestId);

      // First, try to get from songs table (Suno-generated songs)
      console.log('🎵 BottomAudioPlayer: Checking songs table for requestId:', requestId);
      const { data: songData, error: songError } = await supabase
        .from('songs')
        .select('*')
        .eq('id', requestId)
        .single();

      if (!songError && songData) {
        console.log('🎵 BottomAudioPlayer: Found song data:', songData);
        
        // Check if song is completed and has a valid audio URL
        if (songData.status === 'completed' && songData.audio_url && songData.audio_url.startsWith('http')) {
          console.log('✅ BottomAudioPlayer: Found valid audio URL in songs table:', songData.audio_url);
          setAudioUrl(songData.audio_url);
          return songData.audio_url;
        } else {
          console.log('❌ BottomAudioPlayer: Song not ready or invalid URL. Status:', songData.status, 'URL:', songData.audio_url);
          toast.error('Song is not ready for playback yet. Please wait for generation to complete.');
          return null;
        }
      }

      // If not found in songs table, try custom_song_audio table (existing functionality)
      console.log('🎵 BottomAudioPlayer: Checking custom_song_audio table for request:', requestId);
      const { data: audioData, error: audioError } = await supabase
        .from('custom_song_audio')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

      if (!audioError && audioData && audioData.length > 0) {
        let audioRecord = audioData.find(record => record.is_selected === true);
        if (!audioRecord) {
          audioRecord = audioData[0];
        }

        if (audioRecord?.audio_url) {
          console.log('✅ BottomAudioPlayer: Found audio URL in custom_song_audio:', audioRecord.audio_url);
          setAudioUrl(audioRecord.audio_url);
          return audioRecord.audio_url;
        }
      }

      console.log('❌ BottomAudioPlayer: No audio found in either table for request:', requestId);
      toast.error('No audio file found for this song');
      return null;

    } catch (error: any) {
      console.error('💥 BottomAudioPlayer: Error fetching audio URL:', error);
      toast.error('Failed to load audio: ' + error.message);
      return null;
    } finally {
      setLoadingAudio(false);
    }
  };

  const handleAudioEnd = () => {
    console.log('BottomAudioPlayer: Audio ended, repeat mode:', repeatMode);
    
    if (repeatMode === 'one' || repeatMode === 'all') {
      // Repeat current song (both 'one' and 'all' do the same thing for a single song)
      if (audioRef.current) {
        console.log('BottomAudioPlayer: Repeating song');
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(error => {
          console.error('BottomAudioPlayer: Error repeating song:', error);
          setIsPlaying(false);
        });
        setCurrentTime(0);
        return;
      }
    }
    
    // No repeat - stop playing
    console.log('BottomAudioPlayer: No repeat, stopping playback');
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const setupAudioListeners = (audio: HTMLAudioElement) => {
    // Remove any existing listeners first
    audio.removeEventListener('loadedmetadata', () => {});
    audio.removeEventListener('timeupdate', () => {});
    audio.removeEventListener('ended', handleAudioEnd);
    audio.removeEventListener('error', () => {});

    audio.addEventListener('loadedmetadata', () => {
      console.log('BottomAudioPlayer: Audio metadata loaded, duration:', audio.duration);
      setDuration(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener('ended', handleAudioEnd);

    audio.addEventListener('error', (e) => {
      console.error('BottomAudioPlayer: Audio error:', e);
      toast.error('Failed to play audio - file may be corrupted or inaccessible');
      setIsPlaying(false);
    });
  };

  const handlePlayPause = async () => {
    try {
      if (isPlaying && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
        return;
      }

      if (!isPlaying && audioRef.current && audioRef.current.src) {
        await audioRef.current.play();
        setIsPlaying(true);
        return;
      }

      const url = await fetchAudioUrl();
      if (!url) return;

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      const audio = new Audio(url);
      audioRef.current = audio;

      setupAudioListeners(audio);

      audio.volume = volume / 100;
      await audio.play();
      setIsPlaying(true);
      console.log('BottomAudioPlayer: Audio started playing, repeat mode:', repeatMode);
    } catch (error: any) {
      console.error('BottomAudioPlayer: Error in handlePlayPause:', error);
      toast.error('Failed to play audio: ' + error.message);
      setIsPlaying(false);
    }
  };

  const toggleRepeatMode = () => {
    const modes: RepeatMode[] = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    const newMode = modes[nextIndex];
    setRepeatMode(newMode);
    console.log('BottomAudioPlayer: Repeat mode changed to:', newMode);
    
    // Show feedback to user
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

  // Auto-play when player becomes visible
  useEffect(() => {
    if (isVisible && !audioUrl && !loadingAudio) {
      handlePlayPause();
    }
  }, [isVisible]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  if (!isVisible) return null;

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
