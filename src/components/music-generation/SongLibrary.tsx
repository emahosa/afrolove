import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  SortAsc, 
  Music,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import GeneratedSongCard from './GeneratedSongCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Song {
  id: string;
  title: string;
  audio_url: string;
  status: 'pending' | 'completed' | 'rejected' | 'approved';
  created_at: string;
  prompt?: string;
  credits_used: number;
  duration?: number;
}

const SongLibrary = () => {
  const { user } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchSongs = async (showRefreshing = false) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      
      console.log('🔍 SongLibrary: Fetching songs for user:', user.id);
      
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      console.log('📊 SongLibrary: Raw songs data from database:', data);
      console.log('❌ SongLibrary: Database error (if any):', error);

      if (error) {
        console.error('❌ SongLibrary: Error fetching songs:', error);
        toast.error('Failed to load songs: ' + error.message);
        return;
      }

      console.log('✅ SongLibrary: Songs fetched successfully:', data?.length || 0, 'songs');
      
      // Log each song's details for debugging
      data?.forEach((song, index) => {
        console.log(`🎵 SongLibrary: Song ${index + 1}:`, {
          id: song.id,
          title: song.title,
          status: song.status,
          audio_url: song.audio_url,
          url_length: song.audio_url?.length,
          url_starts_with_http: song.audio_url?.startsWith('http'),
          url_contains_suno: song.audio_url?.includes('suno'),
          created_at: song.created_at,
          prompt: song.prompt?.substring(0, 50) + '...'
        });
      });

      setSongs(data || []);
    } catch (error) {
      console.error('💥 SongLibrary: Error in fetchSongs:', error);
      toast.error('Failed to load songs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, [user]);

  // Realtime subscription for song updates
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔄 SongLibrary: Setting up realtime subscription for user:', user.id);
    
    const channel = supabase
      .channel('songs-library-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'songs', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.log('🔄 SongLibrary: Realtime update received!', payload);
          
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
      console.log('🔄 SongLibrary: Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleRefresh = () => {
    console.log('🔄 SongLibrary: Manual refresh triggered');
    fetchSongs(true);
  };

  const filteredAndSortedSongs = songs
    .filter(song => {
      const matchesSearch = song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           song.prompt?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || song.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'credits_used':
          return b.credits_used - a.credits_used;
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const getStatusCounts = () => {
    return {
      all: songs.length,
      completed: songs.filter(s => s.status === 'completed').length,
      pending: songs.filter(s => s.status === 'pending').length,
      rejected: songs.filter(s => s.status === 'rejected').length,
    };
  };

  const statusCounts = getStatusCounts();
  console.log('📊 SongLibrary: Status counts:', statusCounts);

  if (loading) {
    console.log('⏳ SongLibrary: Loading songs...');
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading your music library...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  console.log('🎵 SongLibrary: Rendering with', songs.length, 'songs');

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Your Music Library ({songs.length} songs)
              </CardTitle>
              <CardDescription>
                Manage and play your AI-generated songs
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                title="Refresh library"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search songs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SortAsc className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Latest First</SelectItem>
                <SelectItem value="title">Title A-Z</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="credits_used">Credits Used</SelectItem>
              </SelectContent>
            </Select>

            {/* Filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Songs ({statusCounts.all})</SelectItem>
                <SelectItem value="completed">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Completed ({statusCounts.completed})
                  </div>
                </SelectItem>
                <SelectItem value="pending">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    Processing ({statusCounts.pending})
                  </div>
                </SelectItem>
                <SelectItem value="rejected">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    Failed ({statusCounts.rejected})
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Songs Grid/List */}
      {filteredAndSortedSongs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No songs found</h3>
            <p className="text-muted-foreground">
              {songs.length === 0 
                ? "You haven't generated any songs yet. Start creating!"
                : "Try adjusting your search or filters."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
        }>
          {filteredAndSortedSongs.map((song) => (
            <GeneratedSongCard
              key={song.id}
              song={song}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SongLibrary;
