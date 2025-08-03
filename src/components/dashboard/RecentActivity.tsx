
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Music } from 'lucide-react';
import SongCard from '@/components/SongCard';

interface Song {
  id: string;
  title: string;
  artist: string;
  genre: string;
  audio_url: string;
  cover_image_url: string;
  created_at: string;
  updated_at: string;
}

interface RecentActivityProps {
  songs: Song[];
}

const RecentActivity = ({ songs }: RecentActivityProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {songs.length > 0 ? (
          songs.map(song => (
            <SongCard key={song.id} song={song} />
          ))
        ) : (
          <div className="text-center py-8">
            <Music className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
            <h3 className="text-lg font-semibold mb-1">No Recent Activity</h3>
            <p className="text-muted-foreground">Your recent songs will appear here.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
