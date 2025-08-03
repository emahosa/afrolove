
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
  const [genreFilter, setGenreFilter] = React.useState<string>('');
  const [statusFilter, setStatusFilter] = React.useState<string>('');

  const { data: songs, isLoading } = useQuery({
    queryKey: ['user-songs', user?.id, searchQuery, genreFilter, statusFilter],
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

      if (genreFilter) {
        query = query.eq('genre_id', genreFilter);
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

  if (selectedTrackId) {
    return (
      <SingleTrackView 
        trackId={selectedTrackId} 
        onBack={() => setSelectedTrackId(null)} 
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
            genreFilter={genreFilter}
            onGenreChange={setGenreFilter}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
          />

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              <span className="ml-2">Loading your music...</span>
            </div>
          ) : songs?.length === 0 ? (
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
              songs={songs || []} 
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
