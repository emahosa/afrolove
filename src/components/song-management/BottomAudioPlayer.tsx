import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Download, X, Volume2, Heart, Share2, Repeat, Repeat1, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAudioPlayerContext } from "@/contexts/AudioPlayerContext";

interface BottomAudioPlayerProps {
  onClose: () => void;
  onDownload?: () => void;
  downloadingAudio?: boolean;
}

type RepeatMode = 'none' | 'one' | 'all';

export const BottomAudioPlayer = ({
  onClose,
  onDownload,
  downloadingAudio = false,
}: BottomAudioPlayerProps) => {
  const { currentTrack, isPlaying, togglePlayPause, showPlayer } = useAudioPlayerContext();

  // Debug context state at render
  console.log('[BottomAudioPlayer] Rendered. showPlayer:', showPlayer, 'currentTrack:', currentTrack);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');

  const repeatModeRef = useRef(repeatMode);
  useEffect(() => {
      repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  const togglePlayPauseRef = useRef(togglePlayPause);
  useEffect(() => {
    togglePlayPauseRef.current = togglePlayPause;
  }, [togglePlayPause]);

  const fetchAudioUrl = useCallback(async (requestId: string, type: 'suno' | 'custom') => {
    try {
      console.log('🎵 BottomAudioPlayer: Fetching audio URL for:', { requestId, type });

      if (type === 'suno') {
        const { data: songData, error: songError } = await supabase
          .from('songs')
          .select('audio_url, status')
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
        return songData.audio_url;
      } else {
        const { data: audioData, error: audioError } = await supabase
          .from('custom_song_audio')
          .select('audio_url, is_selected')
          .eq('request_id', requestId)
          .order('created_at', { ascending: false });

        if (audioError || !audioData || audioData.length === 0) {
          console.error('❌ Error fetching custom audio:', audioError);
          toast.error('No audio file found');
          return null;
        }
        let audioRecord = audioData.find(record => record.is_selected === true) || audioData[0];
        if (!audioRecord?.audio_url) {
          toast.error('Audio file URL is missing');
          return null;
        }
        return audioRecord.audio_url;
      }
    } catch (error: any) {
      console.error('💥 Error in fetchAudioUrl:', error);
      toast.error('Failed to load audio: ' + error.message);
      return null;
    }
  }, []);

  useEffect(() => {
    audioRef.current = new Audio();
    const audio = audioRef.current;
    console.log('🔊 Audio player initialized');

    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      if (repeatModeRef.current === 'one' || repeatModeRef.current === 'all') {
        audio.currentTime = 0;
        audio.play().catch(e => console.error("Error on repeat:", e));
      } else {
        togglePlayPauseRef.current();
      }
    };
    const handleCanPlay = () => setLoadingAudio(false);
    const handleWaiting = () => setLoadingAudio(true);
    const handleError = (e: Event) => {
        console.error('❌ Audio error:', e);
        toast.error('Failed to play audio.');
        setLoadingAudio(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("error", handleError);

    return () => {
      console.log('🔊 Audio player cleaned up');
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("error", handleError);
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (currentTrack && audioRef.current) {
        console.log('🔄 Loading new track:', currentTrack);
        const load = async () => {
            setLoadingAudio(true);
            setCurrentTime(0);
            setDuration(0);
            const url = await fetchAudioUrl(currentTrack.id, currentTrack.type || 'custom');
            if (url && audioRef.current) {
                audioRef.current.src = url;
            } else {
                setLoadingAudio(false);
            }
        };
        load();
    }
  }, [currentTrack, fetchAudioUrl]);

  useEffect(() => {
    if (audioRef.current) {
        if (isPlaying && audioRef.current.src) {
            audioRef.current.play().catch(e => console.error("Play error:", e));
        } else {
            audioRef.current.pause();
        }
    }
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleSeek = (value: number[]) => {
    if (audioRef.current && duration > 0) {
      const newTime = value[0];
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0] / 100);
  };
  
  const toggleRepeatMode = () => {
    const modes: RepeatMode[] = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    const newMode = modes[nextIndex];
    setRepeatMode(newMode);
    const modeNames = { 'none': 'Repeat Off', 'all': 'Repeat All', 'one': 'Repeat One' };
    toast.success(`${modeNames[newMode]}`);
  };
  
  const getRepeatIcon = () => {
    switch (repeatMode) {
      case 'one': return <Repeat1 className="h-5 w-5" />;
      case 'all': return <Repeat className="h-5 w-5" />;
      default: return <Repeat className="h-5 w-5" />;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!currentTrack) {
    console.log('[BottomAudioPlayer] No currentTrack, returning null');
    return null;
  }

  return (
    <>
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0, height: '24px',
        background: 'green', color: 'white',
        zIndex: 100000, fontWeight: 'bold',
        fontSize: '14px', textAlign: 'center'
      }}>
        [BottomAudioPlayer VISIBLE]
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 shadow-2xl z-50 animate-slide-in-up">
        <div className="px-6 py-2">
          <Slider
            value={[currentTime]}
            onValueChange={handleSeek}
            max={duration || 100}
            step={0.1}
            className="w-full"
          />
        </div>

        <div className="px-6 py-4">
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="lg"
              onClick={togglePlayPause}
              disabled={loadingAudio}
              className="h-14 w-14 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex-shrink-0"
            >
              {loadingAudio ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-1" />
              )}
            </Button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-white truncate text-lg">{currentTrack.title}</h3>
                <span className="text-sm text-gray-400">by AI Generated</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>{formatTime(currentTime)}</span>
                <span>/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

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
                className={`h-10 w-10 rounded-full ${repeatMode === 'none' ? 'text-gray-400 hover:text-white' : 'text-purple-400 hover:text-purple-300'}`}
                title={`Repeat: ${repeatMode}`}
              >
                {getRepeatIcon()}
              </Button>

              <Button variant="ghost" size="sm" className="h-10 w-10 rounded-full text-gray-400 hover:text-white">
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
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
              </Button>

              <div className="hidden sm:flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-gray-400" />
                <div className="w-24">
                  <Slider
                    value={[volume * 100]}
                    onValueChange={handleVolumeChange}
                    max={100}
                    step={1}
                  />
                </div>
              </div>

              <Button variant="ghost" size="sm" onClick={onClose} className="h-10 w-10 rounded-full text-gray-400 hover:text-red-500">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
