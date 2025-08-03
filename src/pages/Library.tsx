
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import TracksList from '@/components/library/TracksList';
import SingleTrackView from '@/components/library/SingleTrackView';
import VoiceCloneList from '@/components/library/VoiceCloneList';
import LibraryFilters from '@/components/library/LibraryFilters';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Library = () => {
  const { user } = useAuth();
  const [selectedTrackId, setSelectedTrackId] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('all');

  const { data: songs, isLoading } = useQuery({
    queryKey: ['user-songs', user?.id, searchQuery, activeTab],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('songs')
        .select(`
          *,
          genres (
            name,
            description
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed'); // Only show completed songs

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching songs:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user,
  });

  // Transform songs to match Track interface
  const tracks = React.useMemo(() => {
    return (songs || []).map(song => ({
      id: song.id,
      title: song.title,
      type: song.type === "instrumental" ? "instrumental" as const : "song" as const,
      genre: song.genres?.name || 'Unknown',
      date: new Date(song.created_at).toLocaleDateString(),
      audioUrl: song.audio_url
    }));
  }, [songs]);

  // Filter tracks based on active tab
  const filteredTracks = React.useMemo(() => {
    if (activeTab === 'all') return tracks;
    if (activeTab === 'songs') return tracks.filter(track => track.type === 'song');
    if (activeTab === 'instrumentals') return tracks.filter(track => track.type === 'instrumental');
    return tracks;
  }, [tracks, activeTab]);

  // Find selected track
  const selectedTrack = selectedTrackId ? tracks.find(track => track.id === selectedTrackId) : null;

  if (selectedTrackId && selectedTrack) {
    return (
      <SingleTrackView 
        track={selectedTrack}
        onBackClick={() => setSelectedTrackId(null)}
        playingTrack={null}
        onPlayToggle={() => {}}
        onVoiceCloned={() => {}}
        selectedVoiceId={null}
      />
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Your Music Library</h1>
        <p className="text-muted-foreground">Manage and organize your completed songs</p>
      </div>

      <Tabs defaultValue="songs" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="songs">My Songs</TabsTrigger>
          <TabsTrigger value="voices">Voice Clones</TabsTrigger>
        </TabsList>
        
        <TabsContent value="songs" className="space-y-6">
          <LibraryFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              <span className="ml-2">Loading your music...</span>
            </div>
          ) : filteredTracks.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Completed Songs Found</CardTitle>
                <CardDescription>
                  You don't have any completed songs yet. Create some music to see them here!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Note: Only completed songs are displayed in your library. Songs that are still processing will appear here once they're ready.
                </p>
              </CardContent>
            </Card>
          ) : (
            <TracksList 
              tracks={filteredTracks} 
              onTrackSelect={setSelectedTrackId}
            />
          )}
        </TabsContent>

        <TabsContent value="voices">
          <VoiceCloneList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Library;
