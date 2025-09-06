import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Download, Trash2, Music } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

interface Song {
  id: string;
  title: string;
  audio_url: string | null;
  status: string;
  created_at: string;
  genre?: { name: string };
  lyrics?: string;
  prompt?: string;
}

const SongLibrary = () => {
  const { user } = useAuth();
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudioPlayer();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const songsPerPage = 5; // Reduced for better UI with glass buttons

  useEffect(() => {
    if (user) fetchSongs();
  }, [user]);

  const fetchSongs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('songs')
        .select(`id, title, audio_url, status, created_at, lyrics, prompt, genre:genres(name)`)
        .eq('user_id', user?.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSongs(data || []);
    } catch (error: any) {
      toast.error('Failed to load songs');
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (song: Song) => {
    if (currentTrack?.id === song.id && isPlaying) {
      togglePlayPause();
    } else if (song.audio_url) {
      playTrack({ id: song.id, title: song.title, audio_url: song.audio_url });
    }
  };

  const handleDownload = async (song: Song) => {
    if (!song.audio_url) return;
    try {
      const response = await fetch(song.audio_url);
      const blob = await response.blob();
      const filename = `${song.title.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_') || 'song'}.mp3`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded: ${filename}`);
    } catch (error) {
      toast.error('Failed to download song');
    }
  };

  const handleDelete = async (songId: string) => {
    if (!confirm('Are you sure you want to delete this song? This action cannot be undone.')) return;
    try {
      const { error } = await supabase.from('songs').delete().eq('id', songId);
      if (error) throw error;
      setSongs(songs.filter(song => song.id !== songId));
      toast.success('Song deleted successfully');
    } catch (error: any) {
      toast.error('Failed to delete song');
    }
  };

  const totalPages = Math.ceil(songs.length / songsPerPage);
  const currentSongs = songs.slice((currentPage - 1) * songsPerPage, currentPage * songsPerPage);
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
        <span className="ml-3">Loading your songs...</span>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Completed Songs</CardTitle>
          <CardDescription className="text-white/70">Your completed songs will appear here.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Music className="h-12 w-12 mx-auto text-white/40 mb-4" />
          <p className="text-white/40">No completed songs yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">Completed Songs</h2>
        <Badge variant="outline">{songs.length} songs</Badge>
      </div>

      <div className="space-y-3">
        {currentSongs.map((song) => (
          <div key={song.id} className="flex items-center p-2 rounded-lg hover:bg-white/5 transition-colors">
            <Button size="icon" onClick={() => handlePlay(song)} disabled={!song.audio_url} className="mr-3 !w-10 !h-10">
              {currentTrack?.id === song.id && isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <div className="flex-grow min-w-0">
              <p className="font-semibold text-sm truncate">{song.title}</p>
              <p className="text-xs text-white/70">
                {new Date(song.created_at).toLocaleDateString()}
                {song.genre && ` • ${song.genre.name}`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" onClick={() => handleDownload(song)} disabled={!song.audio_url} className="!w-9 !h-9">
                <Download className="h-4 w-4" />
              </Button>
              <Button size="icon" onClick={() => handleDelete(song.id)} className="!w-9 !h-9">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination className="mt-6">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }} />
            </PaginationItem>
            {[...Array(totalPages)].map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink href="#" onClick={(e) => { e.preventDefault(); handlePageChange(i + 1); }} isActive={currentPage === i + 1}>
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </Card>
  );
};

export default SongLibrary;
