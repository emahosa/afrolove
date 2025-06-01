
import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PlayingRequest {
  id: string;
  title: string;
  type?: 'suno' | 'custom';
}

export const useAudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<PlayingRequest | null>(null);

  const fetchAudioUrl = async (request: PlayingRequest): Promise<string | null> => {
    try {
      console.log('🔍 Fetching audio URL for:', request);

      if (request.type === 'suno') {
        // Fetch from songs table for Suno songs
        const { data: songData, error } = await supabase
          .from('songs')
          .select('audio_url, status')
          .eq('id', request.id)
          .single();

        if (error || !songData) {
          console.error('❌ Error fetching song:', error);
          toast.error('Failed to load song');
          return null;
        }

        if (songData.status !== 'completed' || !songData.audio_url || !songData.audio_url.startsWith('http')) {
          console.log('❌ Song not ready:', songData);
          toast.error('Song is not ready for playback');
          return null;
        }

        return songData.audio_url;
      } else {
        // Fetch from custom_song_audio for custom songs
        const { data: audioData, error } = await supabase
          .from('custom_song_audio')
          .select('audio_url')
          .eq('request_id', request.id)
          .eq('is_selected', true)
          .single();

        if (error || !audioData?.audio_url) {
          console.error('❌ Error fetching custom audio:', error);
          toast.error('Failed to load audio');
          return null;
        }

        return audioData.audio_url;
      }
    } catch (error: any) {
      console.error('💥 Error fetching audio URL:', error);
      toast.error('Failed to load audio: ' + error.message);
      return null;
    }
  };

  const handlePlay = useCallback(async (request: PlayingRequest) => {
    console.log('🎵 handlePlay called with:', request);

    try {
      // If currently playing the same track, pause it
      if (currentTrack?.id === request.id && isPlaying && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
        return;
      }

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Fetch the audio URL
      const audioUrl = await fetchAudioUrl(request);
      if (!audioUrl) {
        return;
      }

      console.log('🎵 Creating audio element with URL:', audioUrl);

      // Create new audio element
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      setCurrentTrack(request);

      // Set up event listeners
      audio.addEventListener('loadstart', () => {
        console.log('🎵 Audio loading started');
        toast.loading(`Loading ${request.title}...`);
      });

      audio.addEventListener('canplay', () => {
        console.log('🎵 Audio can play');
        toast.dismiss();
      });

      audio.addEventListener('play', () => {
        console.log('🎵 Audio started playing');
        setIsPlaying(true);
        toast.success(`Now playing: ${request.title}`);
      });

      audio.addEventListener('pause', () => {
        console.log('🎵 Audio paused');
        setIsPlaying(false);
      });

      audio.addEventListener('ended', () => {
        console.log('🎵 Audio ended');
        setIsPlaying(false);
        setCurrentTrack(null);
        toast.success('Playback finished');
      });

      audio.addEventListener('error', (e) => {
        console.error('❌ Audio error:', e);
        setIsPlaying(false);
        setCurrentTrack(null);
        toast.error('Failed to play audio');
      });

      // Start playback
      await audio.play();
      console.log('✅ Audio playback started successfully');

    } catch (error: any) {
      console.error('💥 Error in handlePlay:', error);
      toast.error('Failed to play audio: ' + error.message);
      setIsPlaying(false);
      setCurrentTrack(null);
    }
  }, [currentTrack, isPlaying]);

  const handleStop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTrack(null);
  }, []);

  return { 
    handlePlay, 
    handleStop, 
    isPlaying, 
    currentTrack 
  };
};
