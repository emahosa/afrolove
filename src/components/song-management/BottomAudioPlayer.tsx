import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Download, Music, X, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SpectrumVisualizer } from "./SpectrumVisualizer";

interface BottomAudioPlayerProps {
  requestId: string;
  title: string;
  isVisible: boolean;
  onClose: () => void;
  onDownload?: () => void;
  downloadingAudio?: boolean;
}

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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchAudioUrl = async () => {
    if (audioUrl) return audioUrl;
    
    try {
      setLoadingAudio(true);
      console.log('BottomAudioPlayer: Fetching audio URL for request:', requestId);

      const { data: audioData, error: audioError } = await supabase
        .from('custom_song_audio')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

      if (audioError) {
        console.error('BottomAudioPlayer: Database error:', audioError);
        toast.error('Failed to load audio: ' + audioError.message);
        return null;
      }

      if (!audioData || audioData.length === 0) {
        console.log('BottomAudioPlayer: No audio records found for request:', requestId);
        toast.error('No audio files found for this request');
        return null;
      }

      let audioRecord = audioData.find(record => record.is_selected === true);
      if (!audioRecord) {
        audioRecord = audioData[0];
      }

      if (!audioRecord?.audio_url) {
        console.error('BottomAudioPlayer: Audio record missing URL:', audioRecord);
        toast.error('Audio file URL is missing');
        return null;
      }

      setAudioUrl(audioRecord.audio_url);
      return audioRecord.audio_url;
    } catch (error: any) {
      console.error('BottomAudioPlayer: Error fetching audio URL:', error);
      toast.error('Failed to load audio: ' + error.message);
      return null;
    } finally {
      setLoadingAudio(false);
    }
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

      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
      });

      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
      });

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });

      audio.addEventListener('error', (e) => {
        console.error('BottomAudioPlayer: Audio error:', e);
        toast.error('Failed to play audio - file may be corrupted or inaccessible');
        setIsPlaying(false);
      });

      audio.volume = volume / 100;
      await audio.play();
      setIsPlaying(true);
    } catch (error: any) {
      console.error('BottomAudioPlayer: Error in handlePlayPause:', error);
      toast.error('Failed to play audio: ' + error.message);
      setIsPlaying(false);
    }
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
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-melody-dark via-gray-900 to-melody-dark border-t border-melody-primary/20 shadow-2xl z-50 animate-slide-in-right backdrop-blur-sm">
      <div className="px-6 py-4">
        {/* Spectrum Visualizer */}
        <div className="flex justify-center mb-4">
          <SpectrumVisualizer
            audioElement={audioRef.current}
            isPlaying={isPlaying}
            width={600}
            height={60}
            barCount={80}
            showToggle={true}
          />
        </div>

        <div className="flex items-center gap-6">
          {/* Cover Art */}
          <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-melody-primary via-melody-secondary to-melody-accent flex items-center justify-center flex-shrink-0 shadow-lg">
            <Music className="h-7 w-7 text-white drop-shadow-md" />
          </div>

          {/* Song Info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-base truncate text-melody-light">{title}</h4>
            <p className="text-sm text-melody-light/70">Custom Song</p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePlayPause}
              disabled={loadingAudio}
              className="h-12 w-12 p-0 rounded-full bg-melody-primary hover:bg-melody-primary/80 text-white shadow-lg border border-melody-accent/20"
            >
              {loadingAudio ? (
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
              ) : isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-0.5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onDownload}
              disabled={downloadingAudio}
              className="h-10 w-10 p-0 rounded-full hover:bg-melody-primary/20 text-melody-light border border-melody-primary/30"
            >
              <Download className="h-4 w-4" />
            </Button>

            {/* Volume Control */}
            <div className="hidden sm:flex items-center gap-2 w-24">
              <Volume2 className="h-4 w-4 text-melody-light/70" />
              <Slider
                value={[volume]}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                className="flex-1 [&_[role=slider]]:bg-melody-primary [&_[role=slider]]:border-melody-accent"
              />
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-full hover:bg-red-500/20 text-melody-light/70 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 space-y-2">
          <Slider
            value={[progress]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className="w-full [&_[role=slider]]:bg-melody-primary [&_[role=slider]]:border-melody-accent [&_.bg-primary]:bg-melody-primary"
          />
          <div className="flex items-center justify-between text-xs text-melody-light/70">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
