
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Music } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGenres } from '@/hooks/use-genres';
import { useCreateCustomSong } from '@/hooks/use-create-custom-song';
import { toast } from 'sonner';

export const CreateCustomSongForm = () => {
  const { genres, loading: genresLoading } = useGenres();
  const { createCustomSong, isCreating } = useCreateCustomSong();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genreId, setGenreId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !genreId) {
      toast.error('Please fill in all fields.');
      return;
    }
    
    const result = await createCustomSong({ title, description, genreId });
    if (result) {
      setTitle('');
      setDescription('');
      setGenreId('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request a Custom Song</CardTitle>
        <CardDescription>
          Our producers will create a unique song based on your specifications.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="custom-song-title">Song Title</Label>
            <Input id="custom-song-title" placeholder="e.g., Sunset Over Lagos" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom-song-genre">Genre</Label>
            <Select value={genreId} onValueChange={setGenreId}>
              <SelectTrigger disabled={genresLoading}>
                <SelectValue placeholder="Select a genre..." />
              </SelectTrigger>
              <SelectContent>
                {genres.map((genre) => (
                  <SelectItem key={genre.id} value={genre.id}>
                    {genre.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom-song-description">Description</Label>
            <Textarea
              id="custom-song-description"
              placeholder="Describe the mood, instruments, and theme of your desired song..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          <Button type="submit" disabled={isCreating} className="w-full">
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting Request...
              </>
            ) : (
              <>
                <Music className="mr-2 h-4 w-4" />
                Request Custom Song
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
