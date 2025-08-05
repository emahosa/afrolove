
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Music, Search, Filter, Play } from 'lucide-react';

const Library = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for demonstration
  const songs = [
    { id: 1, title: 'Summer Vibes', genre: 'Pop', duration: '3:45', created: '2025-01-15' },
    { id: 2, title: 'Midnight Jazz', genre: 'Jazz', duration: '4:20', created: '2025-01-14' },
    { id: 3, title: 'Rock Anthem', genre: 'Rock', duration: '3:30', created: '2025-01-13' },
  ];

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">My Library</h1>
          
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search your songs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-900 border-gray-700 text-white pl-10"
              />
            </div>
            <Button variant="outline" className="border-gray-700 text-gray-300">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>

        {songs.length === 0 ? (
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="text-center py-12">
              <Music className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No songs yet</h3>
              <p className="text-gray-400 mb-4">Create your first song to get started</p>
              <Button className="bg-violet-600 hover:bg-violet-700">
                Create Song
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {songs.map((song) => (
              <Card key={song.id} className="bg-gray-900 border-gray-700 hover:border-gray-600 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Button size="sm" variant="ghost" className="text-violet-400 hover:text-violet-300">
                        <Play className="h-4 w-4" />
                      </Button>
                      <div>
                        <h3 className="font-semibold text-white">{song.title}</h3>
                        <p className="text-sm text-gray-400">{song.genre} • {song.duration}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Created</p>
                      <p className="text-sm text-gray-300">{song.created}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;
