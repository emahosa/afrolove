
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Music } from 'lucide-react';

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

interface SongCardProps {
  song: Song;
}

const SongCard = ({ song }: SongCardProps) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <div className="bg-primary/10 p-2 rounded-md">
            <Music className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{song.title}</h3>
            <p className="text-sm text-muted-foreground">{song.artist}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SongCard;
