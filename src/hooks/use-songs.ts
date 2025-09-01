
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Song {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  cover_image_url?: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  prompt: string;
  credits_used: number;
  duration: number;
}

export const useSongs = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSongs = async () => {
    try {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map database fields to Song interface
      const mappedSongs = data?.map(song => ({
        id: song.id,
        title: song.title || 'Untitled',
        artist: song.artist || 'AI Generated',
        audio_url: song.audio_url,
        cover_image_url: song.cover_image_url,
        status: ['pending', 'completed', 'failed'].includes(song.status) ? song.status : 'pending',
        created_at: song.created_at,
        prompt: song.prompt || '',
        credits_used: song.credits_used || 0,
        duration: song.duration || 0
      })) || [];
      
      setSongs(mappedSongs);
    } catch (error) {
      console.error('Error fetching songs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, []);

  return { songs, loading, refetch: fetchSongs };
};
