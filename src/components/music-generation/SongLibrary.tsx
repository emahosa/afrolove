import { useState, useEffect, useCallback } from "react";
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
  const songsPerPage = 10;

  const fetchSongs = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('songs')
        .select(`
          id,
          title,
          audio_url,
          status,
          created_at,
          lyrics,
          prompt,
          genre:genres(name)
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSongs(data || []);
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error('Failed to load songs: ' + error.message);
      } else {
        toast.error('An unknown error occurred while fetching songs.');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchSongs();
    }
  }, [user, fetchSongs]);

  const handlePlay = (song: Song) => {
    if (currentTrack?.id === song.id && isPlaying) {
      togglePlayPause();
    } else if (song.audio_url) {
      playTrack({
        id: song.id,
        title: song.title,
        audio_url: song.audio_url
      });
    }
  };

  const handleDownload = async (song: Song) => {
    if (!song.audio_url) {
      toast.error('Audio file not available for download');
      return;
    }

    try {
      const response = await fetch(song.audio_url);
      const blob = await response.blob();
      
      const cleanTitle = song.title
        .replace(/[^a-zA-Z0-9\s-_]/g, '')
        .replace(/\s+/g, '_')
        .trim();
      
      const filename = `${cleanTitle || 'song'}.mp3`;
      
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
    if (!confirm('Are you sure you want to delete this song?')) return;

    try {
      const { error } = await supabase
        .from('songs')
        .delete()
        .eq('id', songId);

      if (error) throw error;
      
      setSongs(songs.filter(song => song.id !== songId));
      toast.success('Song deleted successfully');
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error('Failed to delete song: ' + error.message);
      } else {
        toast.error('An unknown error occurred while deleting the song.');
      }
    }
  };

  const totalPages = Math.ceil(songs.length / songsPerPage);
  const indexOfLastSong = currentPage * songsPerPage;
  const indexOfFirstSong = indexOfLastSong - songsPerPage;
  const currentSongs = songs.slice(indexOfFirstSong, indexOfLastSong);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white/50"></div>
        <span className="ml-3">Loading your songs...</span>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Completed Songs
          </CardTitle>
          <CardDescription className="text-white/70">
            Your completed songs will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Music className="h-12 w-12 mx-auto text-white/50 mb-4" />
          <p className="text-white/50">No completed songs yet.</p>
        </CardContent>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Music className="h-6 w-6" />
          Completed Songs
        </h2>
        <Badge variant="secondary">{songs.length} songs</Badge>
      </div>

      <div className="space-y-2">
        {currentSongs.map((song) => (
          <div key={song.id} className="flex items-center p-2 rounded-lg hover:bg-white/10 transition-colors">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handlePlay(song)}
              disabled={!song.audio_url}
              className="mr-2 text-white/70 hover:text-white"
            >
              {currentTrack?.id === song.id && isPlaying ? (
                <Pause className="h-5 w-5 text-white" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
            <div className="flex-grow min-w-0">
              <p className="font-semibold text-sm truncate text-white">{song.title}</p>
              <p className="text-xs text-white/70">
                {new Date(song.created_at).toLocaleDateString()}
                {song.genre && ` • ${song.genre.name}`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDownload(song)}
                disabled={!song.audio_url}
                className="text-white/70 hover:text-white"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(song.id)}
                className="text-red-500/80 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination className="mt-4">
          <PaginationContent className="text-white/70">
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(currentPage - 1);
                }}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "hover:bg-white/10"}
              />
            </PaginationItem>
            {[...Array(totalPages)].map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(i + 1);
                  }}
                  isActive={currentPage === i + 1}
                  className="hover:bg-white/10 data-[active=true]:bg-white/20 data-[active=true]:text-white"
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(currentPage + 1);
                }}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "hover:bg-white/10"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default SongLibrary;
