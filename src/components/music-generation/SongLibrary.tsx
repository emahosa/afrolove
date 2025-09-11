
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Download, Trash2, Music, Loader2, MoreHorizontal, Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePagination, DOTS } from "@/hooks/use-pagination";

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

const SongLibrary = ({ onSongSelect, searchTerm = "" }: { onSongSelect: (song: Song) => void; searchTerm?: string }) => {
  const { user } = useAuth();
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudioPlayer();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [favoriteSongs, setFavoriteSongs] = useState<Set<string>>(new Set());
  const songsPerPage = 10;

  useEffect(() => {
    if (user) {
      fetchSongs();
    }
  }, [user]);

  const fetchSongs = async () => {
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
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSongs(data || []);
    } catch (error: any) {
      console.error('Error fetching songs:', error);
      toast.error('Failed to load songs');
    } finally {
      setLoading(false);
    }
  };

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
      console.error('Download error:', error);
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
    } catch (error: any) {
      console.error('Error deleting song:', error);
      toast.error('Failed to delete song');
    }
  };

  const toggleFavorite = (songId: string) => {
    setFavoriteSongs(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(songId)) {
        newFavorites.delete(songId);
        toast.success('Removed from favorites');
      } else {
        newFavorites.add(songId);
        toast.success('Added to favorites');
      }
      return newFavorites;
    });
  };

  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredSongs.length / songsPerPage);
  const indexOfLastSong = currentPage * songsPerPage;
  const indexOfFirstSong = indexOfLastSong - songsPerPage;
  const currentSongs = filteredSongs.slice(indexOfFirstSong, indexOfLastSong);

  const paginationRange = usePagination({
    currentPage,
    totalPages,
    siblingCount: 1,
  });

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const getSongThumbnail = (song: Song) => {
    // Generate a simple gradient background based on the song title
    const colors = [
      'from-pink-500 to-purple-500',
      'from-blue-500 to-teal-500', 
      'from-purple-500 to-red-500',
      'from-green-500 to-blue-500',
      'from-purple-500 to-pink-500'
    ];
    const colorIndex = song.title.charCodeAt(0) % colors.length;
    return colors[colorIndex];
  };

  const getStatusInfo = (song: Song) => {
    if (song.status === 'completed' && song.audio_url) {
      return { 
        tags: [song.genre?.name, 'Instruments'].filter(Boolean),
        canPlay: true,
        showActions: true
      };
    } else if (song.status === 'pending' || song.status === 'approved') {
      return { 
        tags: ['Generating...'],
        canPlay: false,
        showActions: false
      };
    } else {
      return { 
        tags: ['Processing...'],
        canPlay: false,
        showActions: false
      };
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        <span className="ml-3 text-muted-foreground">Loading your songs...</span>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="text-center py-8">
        <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No songs yet. Create your first song!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {currentSongs.map((song) => {
        const statusInfo = getStatusInfo(song);
        return (
          <div key={song.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer" onClick={() => statusInfo.canPlay ? onSongSelect(song) : undefined}>
            {/* Thumbnail */}
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getSongThumbnail(song)} flex items-center justify-center flex-shrink-0`}>
              {song.status === 'pending' || song.status === 'approved' ? (
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              ) : (
                <Music className="h-5 w-5 text-white" />
              )}
            </div>
            
            {/* Song Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">{song.title}</h3>
              <div className="flex gap-2 mt-1">
                {statusInfo.tags.map((tag, index) => (
                  <span key={index} className="text-xs text-muted-foreground">
                    {tag}
                    {index < statusInfo.tags.length - 1 && statusInfo.tags.length > 1 && (
                      <span className="ml-2">•</span>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {statusInfo.canPlay && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlay(song);
                  }}
                  disabled={!song.audio_url}
                >
                  {currentTrack?.id === song.id && isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              )}
              
              {statusInfo.showActions && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(song.id);
                    }}
                  >
                    <Heart 
                      className={`h-4 w-4 ${favoriteSongs.has(song.id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} 
                    />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(song.id);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>
        );
      })}

      {totalPages > 1 && (
        <Pagination className="mt-6">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(currentPage - 1);
                }}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {paginationRange.map((pageNumber, index) => {
              if (pageNumber === DOTS) {
                return (
                  <PaginationItem key={`${pageNumber}-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                );
              }

              return (
                <PaginationItem key={pageNumber}>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(pageNumber as number);
                    }}
                    isActive={currentPage === pageNumber}
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(currentPage + 1);
                }}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default SongLibrary;
