
import { useState, useEffect } from 'react';

interface Song {
  id: string;
  title: string;
  artist: string;
  genre: string;
  audio_url: string;
  cover_image_url: string;
  created_at: string;
  updated_at: string;
}

export const useSongs = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setSongs([]);
      setLoading(false);
    }, 1000);
  }, []);

  return { songs, loading };
};
