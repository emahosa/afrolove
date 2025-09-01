
import GeneratedSongCard from '@/components/music-generation/GeneratedSongCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Music } from 'lucide-react';

const sampleSongs = [
  {
    id: 'sample-1',
    title: 'Cosmic Drift',
    audio_url: 'https://storage.googleapis.com/melody-share/cosmic-drift.mp3',
    status: 'completed' as const,
    created_at: '2025-06-15T12:00:00Z',
    prompt: 'A dreamy synthwave track with a retro vibe, perfect for late-night drives through a neon city.',
    credits_used: 0,
    duration: 184,
  },
  {
    id: 'sample-2',
    title: 'Forest Lullaby',
    audio_url: 'https://storage.googleapis.com/melody-share/forest-lullaby.mp3',
    status: 'completed' as const,
    created_at: '2025-06-15T12:05:00Z',
    prompt: 'A gentle acoustic guitar melody with soft piano, evoking a peaceful walk through a sun-dappled forest.',
    credits_used: 0,
    duration: 152,
  },
];

const SampleMusic = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5 text-purple-500" />
          Sample Our Music
        </CardTitle>
        <CardDescription>
          You can't generate new songs on a Voter plan, but you can listen to these samples.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {sampleSongs.map(song => (
            <GeneratedSongCard key={song.id} song={song} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SampleMusic;
