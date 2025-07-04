
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Music, Download, Play, Pause, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface Song {
  id: string;
  title: string;
  prompt: string;
  audio_url: string;
  image_url: string;
  status: string;
  created_at: string;
  duration: number;
  tags: string;
}

const SongLibrary = () => {
  const { user } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserSongs();
    }
  }, [user]);

  const fetchUserSongs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSongs(data || []);
    } catch (error: any) {
      console.error('Error fetching songs:', error);
      toast.error('Failed to load your songs');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (song: Song) => {
    if (!song.audio_url) {
      toast.error('Audio file not available');
      return;
    }

    try {
      // Create a clean filename from the song title
      const cleanTitle = song.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const fileName = `${cleanTitle}.mp3`;
      
      // Fetch the audio file
      const response = await fetch(song.audio_url);
      if (!response.ok) throw new Error('Failed to fetch audio');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(url);
      
      toast.success(`Downloaded: ${song.title}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download song');
    }
  };

  const handlePlay = (songId: string) => {
    if (playingId === songId) {
      setPlayingId(null);
    } else {
      setPlayingId(songId);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'processing':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        <span className="ml-2">Loading your songs...</span>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Your Song Library
          </CardTitle>
          <CardDescription>Your generated songs will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No songs generated yet. Start creating your first song!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Music className="h-6 w-6" />
          Your Song Library ({songs.length})
        </h2>
        <Button onClick={fetchUserSongs} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {songs.map((song) => (
          <Card key={song.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2">{song.title}</CardTitle>
                  <CardDescription className="line-clamp-2 mt-1">
                    {song.prompt}
                  </CardDescription>
                </div>
                {getStatusBadge(song.status)}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {song.audio_url && song.status === 'completed' && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePlay(song.id)}
                      className="flex-1"
                    >
                      {playingId === song.id ? (
                        <><Pause className="w-4 h-4 mr-2" />Pause</>
                      ) : (
                        <><Play className="w-4 h-4 mr-2" />Play</>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(song)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                
                {playingId === song.id && song.audio_url && (
                  <audio
                    controls
                    autoPlay
                    className="w-full"
                    onEnded={() => setPlayingId(null)}
                  >
                    <source src={song.audio_url} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                )}

                <div className="text-xs text-muted-foreground">
                  Created: {new Date(song.created_at).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SongLibrary;
