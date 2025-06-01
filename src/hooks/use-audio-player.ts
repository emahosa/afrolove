
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
          .select('*')
          .eq('id', request.id)
          .single();

        console.log('🔍 Raw song data from database:', songData);
        console.log('🔍 Database error (if any):', error);

        if (error) {
          console.error('❌ Supabase error fetching song:', error);
          toast.error('Failed to load song from database');
          return null;
        }

        if (!songData) {
          console.error('❌ No song data returned from database');
          toast.error('Song not found in database');
          return null;
        }

        console.log('📊 Song details:', {
          id: songData.id,
          title: songData.title,
          status: songData.status,
          audio_url: songData.audio_url,
          url_length: songData.audio_url?.length,
          url_type: typeof songData.audio_url,
          starts_with_http: songData.audio_url?.startsWith('http')
        });

        if (songData.status !== 'completed') {
          console.log('❌ Song not completed, status:', songData.status);
          toast.error(`Song is ${songData.status}, not ready for playback`);
          return null;
        }

        if (!songData.audio_url) {
          console.log('❌ No audio URL in song data');
          toast.error('Song has no audio URL');
          return null;
        }

        if (!songData.audio_url.startsWith('http')) {
          console.log('❌ Invalid audio URL format:', songData.audio_url);
          toast.error('Invalid audio URL format');
          return null;
        }

        console.log('✅ Valid audio URL found:', songData.audio_url);
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
        console.log('⏸️ Pausing currently playing track');
        audioRef.current.pause();
        setIsPlaying(false);
        return;
      }

      // Stop any currently playing audio
      if (audioRef.current) {
        console.log('🛑 Stopping previous audio');
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Fetch the audio URL
      console.log('🔍 Fetching audio URL...');
      const audioUrl = await fetchAudioUrl(request);
      
      if (!audioUrl) {
        console.log('❌ No audio URL returned, stopping playback attempt');
        return;
      }

      console.log('🎵 Creating audio element with URL:', audioUrl);

      // Test if the URL is accessible
      try {
        const response = await fetch(audioUrl, { method: 'HEAD' });
        console.log('🌐 URL accessibility test:', {
          url: audioUrl,
          status: response.status,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        if (!response.ok) {
          console.error('❌ Audio URL not accessible:', response.status);
          toast.error(`Audio file not accessible (${response.status})`);
          return;
        }
      } catch (fetchError) {
        console.error('❌ Error testing audio URL:', fetchError);
        toast.error('Cannot access audio file');
        return;
      }

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
        console.error('❌ Audio error details:', {
          error: e.type,
          target: e.target,
          currentSrc: audio.currentSrc,
          readyState: audio.readyState,
          networkState: audio.networkState
        });
        setIsPlaying(false);
        setCurrentTrack(null);
        toast.error('Failed to play audio - file may be corrupted or inaccessible');
      });

      // Start playback
      console.log('▶️ Starting audio playback...');
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
