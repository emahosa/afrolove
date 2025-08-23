
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TracksList from '@/components/library/TracksList';
import VoiceCloneList from '@/components/library/VoiceCloneList';
import { Music, Mic, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const Library = () => {
  const [loading, setLoading] = useState(false);
  
  // Mock tracks data - in a real app this would come from a hook or API
  const mockTracks = [
    {
      id: '1',
      title: 'AI Generated Song 1',
      type: 'song' as const,
      genre: 'Pop',
      date: '2025-01-15'
    },
    {
      id: '2',
      title: 'Instrumental Track',
      type: 'instrumental' as const,
      genre: 'Electronic',
      date: '2025-01-14'
    }
  ];

  const handleTrackSelect = (trackId: string) => {
    console.log('Track selected:', trackId);
    // In a real app, this would handle track selection/playback
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-900/20 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4 flex items-center gap-3">
            <Music className="h-8 w-8 text-purple-400" />
            My Library
          </h1>
          <p className="text-gray-400">Your created songs and voice clones</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-purple-400" />
              <p className="text-xl text-gray-300">Loading your library...</p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="songs" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-900/50 border-gray-800">
              <TabsTrigger 
                value="songs" 
                className="data-[state=active]:bg-purple-600 text-gray-300 data-[state=active]:text-white"
              >
                <Music className="h-4 w-4 mr-2" />
                Songs
              </TabsTrigger>
              <TabsTrigger 
                value="voices" 
                className="data-[state=active]:bg-purple-600 text-gray-300 data-[state=active]:text-white"
              >
                <Mic className="h-4 w-4 mr-2" />
                Voice Clones
              </TabsTrigger>
            </TabsList>

            <TabsContent value="songs" className="mt-6">
              <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800">
                <CardContent className="p-6">
                  <TracksList 
                    tracks={mockTracks}
                    onTrackSelect={handleTrackSelect}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="voices" className="mt-6">
              <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800">
                <CardContent className="p-6">
                  <VoiceCloneList />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Library;
