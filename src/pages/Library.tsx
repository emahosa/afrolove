import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Music, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import LibraryFilters from "@/components/library/LibraryFilters";
import GeneratedSongCard from "@/components/music-generation/GeneratedSongCard";
import VoterLockScreen from "@/components/VoterLockScreen";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import Layout from "@/components/Layout";
import { motion } from "framer-motion";

export interface Song {
  id: string;
  title: string;
  audio_url: string;
  status: 'pending' | 'completed' | 'rejected' | 'approved';
  created_at: string;
  prompt?: string;
  credits_used: number;
  duration?: number;
  lyrics?: string;
}

const Library = () => {
  const { user, isVoter, isSubscriber, isAdmin, isSuperAdmin, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const songsPerPage = 12; // Adjusted for better grid layout

  // Check if user is only a voter (no subscriber/admin roles)
  const isOnlyVoter = isVoter() && !isSubscriber() && !isAdmin() && !isSuperAdmin();

  const fetchSongs = useCallback(async (showRefreshingIndicator = false) => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    
    try {
      if (showRefreshingIndicator) setIsRefreshing(true);
      else setIsLoading(true);
      
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['completed', 'approved'])
        .order('created_at', { ascending: false });
        
      if (error) {
        toast.error('Failed to load songs: ' + error.message);
        return;
      }
      
      setSongs(data || []);
    } catch (error) {
      toast.error('Failed to load songs');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchSongs();
    } else {
      setIsLoading(false);
    }
  }, [user, fetchSongs]);

  // Realtime subscription for song updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('songs-library-page-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'songs', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newSong = payload.new as Song;
            setSongs(currentSongs => [newSong, ...currentSongs]);
            if (newSong.status === 'completed') {
              toast.success(`🎵 "${newSong.title}" is ready!`);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedSong = payload.new as Song;
            setSongs(currentSongs =>
              currentSongs.map(song => (song.id === updatedSong.id ? updatedSong : song))
            );

            if (updatedSong.status === 'completed') {
              toast.success(`🎵 "${updatedSong.title}" is ready!`);
            } else if (updatedSong.status === 'rejected') {
              toast.error(`❌ "${updatedSong.title}" failed to generate.`);
            }
          } else if (payload.eventType === 'DELETE') {
            setSongs(currentSongs => 
              currentSongs.filter(song => song.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  if (loading) {
    return (
      <Layout active="Library">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          <span className="ml-2">Loading...</span>
        </div>
      </Layout>
    );
  }

  if (isOnlyVoter) {
    return <VoterLockScreen feature="your music library" />;
  }
  
  const handleRefresh = () => {
    fetchSongs(true);
  };
  
  if (isLoading) {
    return (
      <Layout active="Library">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading your library...</span>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout active="Library">
        <p className="text-gray-400">Please log in to view your songs.</p>
      </Layout>
    );
  }

  const filteredSongs = songs.filter(song => {
    // Tab filtering
    if (activeTab === 'songs') {
      if (!song.lyrics || song.lyrics.trim() === '[Instrumental]') return false;
    } else if (activeTab === 'instrumentals') {
      if (song.lyrics && song.lyrics.trim() !== '[Instrumental]') return false;
    }

    // Search query filtering
    if (searchQuery.trim() === '') return true;
    const lowerCaseQuery = searchQuery.toLowerCase();
    const titleMatch = song.title.toLowerCase().includes(lowerCaseQuery);
    const promptMatch = song.prompt?.toLowerCase().includes(lowerCaseQuery);
    return titleMatch || promptMatch;
  });

  const totalPages = Math.ceil(filteredSongs.length / songsPerPage);
  const indexOfLastSong = currentPage * songsPerPage;
  const indexOfFirstSong = indexOfLastSong - songsPerPage;
  const currentSongs = filteredSongs.slice(indexOfFirstSong, indexOfLastSong);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  return (
    <Layout active="Library">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-white">My Library</h1>
          <p className="text-gray-400">All your completed songs</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isRefreshing} className="glass-btn">
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="mb-6">
        <LibraryFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      <div>
        {songs.length > 0 ? (
          filteredSongs.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {currentSongs.map((song, i) => (
                  <motion.div
                    key={song.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                  >
                    <GeneratedSongCard song={song} />
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 border-2 border-dashed border-white/20 rounded-lg text-gray-400">
              <Music className="mx-auto h-12 w-12" />
              <h3 className="mt-4 text-lg font-medium text-white">No matching songs</h3>
              <p className="mt-1 text-sm">Try a different search or filter.</p>
            </div>
          )
        ) : (
          !isLoading && (
            <div className="text-center py-16 border-2 border-dashed border-white/20 rounded-lg text-gray-400">
              <Music className="mx-auto h-12 w-12" />
              <h3 className="mt-4 text-lg font-medium text-white">No songs yet</h3>
              <p className="mt-1 text-sm">Create your first song to see it here.</p>
            </div>
          )
        )}
      </div>

      {totalPages > 1 && (
        <Pagination className="mt-8">
          <PaginationContent className="text-gray-300">
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(currentPage - 1);
                }}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "hover:bg-white/10 rounded-lg"}
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
                  className="hover:bg-white/10 rounded-lg data-[active=true]:bg-purple-600/40 data-[active=true]:text-white"
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
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "hover:bg-white/10 rounded-lg"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </Layout>
  );
};

export default Library;
