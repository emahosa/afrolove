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
  const { user, isVoter, isSubscriber, isAdmin, isSuperAdmin, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const songsPerPage = 12;

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
        
      if (error) throw error;
      setSongs(data || []);
    } catch (error: any) {
      toast.error('Failed to load songs: ' + error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) fetchSongs();
    else setIsLoading(false);
  }, [user, fetchSongs]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('songs-library-page-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'songs', filter: `user_id=eq.${user.id}` },
        (payload) => {
          // Refetch to ensure data is consistent
          fetchSongs();
          if (payload.eventType === 'INSERT' && (payload.new as Song).status === 'completed') {
            toast.success(`🎵 "${(payload.new as Song).title}" is ready!`);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, fetchSongs]);

  if (authLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (isOnlyVoter) {
    return <VoterLockScreen feature="your music library" />;
  }
  
  const handleRefresh = () => fetchSongs(true);

  const filteredSongs = songs.filter(song => {
    if (activeTab === 'songs' && (!song.lyrics || song.lyrics.trim() === '[Instrumental]')) return false;
    if (activeTab === 'instrumentals' && (song.lyrics && song.lyrics.trim() !== '[Instrumental]')) return false;
    if (searchQuery.trim() === '') return true;
    const lowerCaseQuery = searchQuery.toLowerCase();
    return song.title.toLowerCase().includes(lowerCaseQuery) || song.prompt?.toLowerCase().includes(lowerCaseQuery);
  });

  const totalPages = Math.ceil(filteredSongs.length / songsPerPage);
  const currentSongs = filteredSongs.slice((currentPage - 1) * songsPerPage, currentPage * songsPerPage);
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /><span className="ml-2">Loading your library...</span></div>;
    }
    if (songs.length === 0) {
      return <div className="text-center py-16 glass-surface"><Music className="mx-auto h-12 w-12" /><h3 className="mt-4 text-lg font-medium">No songs yet</h3><p className="mt-1 text-sm text-white/70">Create your first song to see it here.</p></div>;
    }
    if (filteredSongs.length === 0) {
      return <div className="text-center py-16 glass-surface"><Music className="mx-auto h-12 w-12" /><h3 className="mt-4 text-lg font-medium">No matching songs</h3><p className="mt-1 text-sm text-white/70">Try a different search or filter.</p></div>;
    }
    return (
      <div style={{ perspective: "1000px" }}>
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {currentSongs.map((song) => (
            <GeneratedSongCard key={song.id} song={song} />
          ))}
        </motion.div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">My Library</h1>
          <p className="text-white/70 mt-2">All your generated songs and instrumentals.</p>
        </div>
        <Button onClick={handleRefresh} variant="secondary" size="sm" disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <LibraryFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {renderContent()}

      {totalPages > 1 && (
        <Pagination className="mt-8">
          <PaginationContent>
            <PaginationItem><PaginationPrevious onClick={() => handlePageChange(currentPage - 1)} /></PaginationItem>
            {[...Array(totalPages)].map((_, i) => (
              <PaginationItem key={i}><PaginationLink isActive={currentPage === i + 1} onClick={() => handlePageChange(i + 1)}>{i + 1}</PaginationLink></PaginationItem>
            ))}
            <PaginationItem><PaginationNext onClick={() => handlePageChange(currentPage + 2)} /></PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default Library;
