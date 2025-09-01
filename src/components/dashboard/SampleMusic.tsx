
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import GeneratedSongCard from '@/components/music-generation/GeneratedSongCard';

interface Song {
  id: string;
  title: string;
  audio_url: string;
  status: "completed";
  created_at: string;
  prompt: string;
  credits_used: number;
  duration: number;
}

const SampleMusic = () => {
  const [sampleSongs, setSampleSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSampleSongs = async () => {
      try {
        const { data, error } = await supabase
          .from('songs')
          .select('*')
          .eq('status', 'completed')
          .limit(6)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSampleSongs(data || []);
      } catch (error) {
        console.error('Error fetching sample songs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSampleSongs();
  }, []);

  if (loading) {
    return <div className="text-center py-8">Loading sample music...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sample Music</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sampleSongs.map((song) => (
            <GeneratedSongCard 
              key={song.id} 
              song={song}
              isPlaying={false}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SampleMusic;
