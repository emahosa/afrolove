import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Download, Music } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SpectrumVisualizer } from "./SpectrumVisualizer";

interface AudioPlayerCardProps {
  requestId: string;
  title: string;
  isDownloadable?: boolean;
  onDownload?: () => void;
  downloadingAudio?: boolean;
}

export const AudioPlayerCard = ({ 
  requestId, 
  title, 
  isDownloadable = true,
  onDownload,
  downloadingAudio = false
}: AudioPlayerCardProps) => {
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
      console.log('AudioPlayerCard: Fetching audio URL for request:', requestId);

      const { data: audioData, error: audioError } = await supabase
        .from('custom_song_audio')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

      if (audioError) {
        console.error('AudioPlayerCard: Database error:', audioError);
        toast.error('Failed to load audio: ' + audioError.message);
        return null;
      }

      if (!audioData || audioData.length === 0) {
        console.log('AudioPlayerCard: No audio records found for request:', requestId);
        toast.error('No audio files found for this request');
        return null;
      }

      let audioRecord = audioData.find(record => record.is_selected === true);
      if (!audioRecord) {
        audioRecord = audioData[0];
      }

      if (!audioRecord?.audio_url) {
        console.error('AudioPlayerCard: Audio record missing URL:', audioRecord);
        toast.error('Audio file URL is missing');
        return null;
      }

      setAudioUrl(audioRecord.audio_url);
      return audioRecord.audio_url;
    } catch (error: any) {
      console.error('AudioPlayerCard: Error fetching audio URL:', error);
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
        console.error('AudioPlayerCard: Audio error:', e);
        toast.error('Failed to play audio - file may be corrupted or inaccessible');
        setIsPlaying(false);
      });

      audio.volume = volume / 100;
      await audio.play();
      setIsPlaying(true);
    } catch (error: any) {
      console.error('AudioPlayerCard: Error in handlePlayPause:', error);
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

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  return (
    <Card className="overflow-hidden bg-gradient-to-r from-melody-primary/5 to-melody-secondary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Cover Art */}
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-melody-primary to-melody-secondary flex items-center justify-center flex-shrink-0">
            <Music className="h-8 w-8 text-white" />
          </div>

          {/* Player Controls and Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-sm truncate">{title}</h4>
                <p className="text-xs text-muted-foreground">Custom Song</p>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePlayPause}
                  disabled={loadingAudio}
                  className="h-8 w-8 p-0 rounded-full bg-melody-primary/10 hover:bg-melody-primary/20"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4 ml-0.5" />
                  )}
                </Button>

                {isDownloadable && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDownload}
                    disabled={downloadingAudio}
                    className="h-8 w-8 p-0 rounded-full bg-melody-secondary/10 hover:bg-melody-secondary/20"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Spectrum Visualizer */}
            <div className="mb-2 flex justify-center">
              <SpectrumVisualizer
                audioElement={audioRef.current}
                isPlaying={isPlaying}
                width={320}
                height={40}
                barCount={40}
                showToggle={false}
              />
            </div>

            {/* Progress and Time */}
            <div className="space-y-2">
              <Slider
                value={[progress]}
                onValueChange={handleSeek}
                max={100}
                step={0.1}
                className="w-full"
              />
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
