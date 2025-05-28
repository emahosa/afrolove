
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, Download, Heart, Share2, MoreHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SpectrumVisualizer } from "./SpectrumVisualizer";

interface SoundCloudPlayerProps {
  requestId: string;
  title: string;
  isDownloadable?: boolean;
  onDownload?: () => void;
  downloadingAudio?: boolean;
  artist?: string;
}

export const SoundCloudPlayer = ({ 
  requestId, 
  title, 
  isDownloadable = true,
  onDownload,
  downloadingAudio = false,
  artist = "AI Generated"
}: SoundCloudPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchAudioUrl = async () => {
    if (audioUrl) return audioUrl;
    
    try {
      setLoadingAudio(true);
      console.log('SoundCloudPlayer: Fetching audio URL for request:', requestId);

      const { data: audioData, error: audioError } = await supabase
        .from('custom_song_audio')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

      if (audioError) {
        console.error('SoundCloudPlayer: Database error:', audioError);
        toast.error('Failed to load audio: ' + audioError.message);
        return null;
      }

      if (!audioData || audioData.length === 0) {
        console.log('SoundCloudPlayer: No audio records found for request:', requestId);
        toast.error('No audio files found for this request');
        return null;
      }

      let audioRecord = audioData.find(record => record.is_selected === true);
      if (!audioRecord) {
        audioRecord = audioData[0];
      }

      if (!audioRecord?.audio_url) {
        console.error('SoundCloudPlayer: Audio record missing URL:', audioRecord);
        toast.error('Audio file URL is missing');
        return null;
      }

      setAudioUrl(audioRecord.audio_url);
      return audioRecord.audio_url;
    } catch (error: any) {
      console.error('SoundCloudPlayer: Error fetching audio URL:', error);
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
        console.error('SoundCloudPlayer: Audio error:', e);
        toast.error('Failed to play audio - file may be corrupted or inaccessible');
        setIsPlaying(false);
      });

      audio.volume = volume / 100;
      await audio.play();
      setIsPlaying(true);
    } catch (error: any) {
      console.error('SoundCloudPlayer: Error in handlePlayPause:', error);
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
    <div className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      {/* Waveform/Visualizer Section */}
      <div className="relative bg-gradient-to-r from-orange-100 to-orange-50 p-4">
        <div className="flex justify-center mb-2">
          <SpectrumVisualizer
            audioElement={audioRef.current}
            isPlaying={isPlaying}
            width={600}
            height={80}
            barCount={100}
            showToggle={false}
          />
        </div>
        
        {/* Progress overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div 
            className="h-full bg-orange-500/20 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Progress bar for seeking */}
        <div className="absolute inset-0 cursor-pointer" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const percentage = (clickX / rect.width) * 100;
          handleSeek([percentage]);
        }} />
      </div>

      {/* Controls Section */}
      <div className="p-4 bg-white">
        <div className="flex items-center gap-4">
          {/* Play/Pause Button */}
          <Button
            variant="ghost"
            size="lg"
            onClick={handlePlayPause}
            disabled={loadingAudio}
            className="h-14 w-14 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex-shrink-0"
          >
            {loadingAudio ? (
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
            ) : isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 ml-1" />
            )}
          </Button>

          {/* Song Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 truncate">{title}</h3>
              <span className="text-sm text-gray-500">by {artist}</span>
            </div>
            
            {/* Time Display */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{formatTime(currentTime)}</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsLiked(!isLiked)}
              className={`h-8 w-8 rounded-full ${isLiked ? 'text-red-500' : 'text-gray-400'} hover:text-red-500`}
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 rounded-full text-gray-400 hover:text-gray-600"
            >
              <Share2 className="h-4 w-4" />
            </Button>

            {isDownloadable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDownload}
                disabled={downloadingAudio}
                className="h-8 w-8 rounded-full text-gray-400 hover:text-gray-600"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}

            {/* Volume Control */}
            <div className="hidden sm:flex items-center gap-2 ml-2">
              <Volume2 className="h-4 w-4 text-gray-400" />
              <div className="w-20">
                <Slider
                  value={[volume]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  className="[&_[role=slider]]:bg-orange-500 [&_[role=slider]]:border-orange-600"
                />
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 rounded-full text-gray-400 hover:text-gray-600"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
