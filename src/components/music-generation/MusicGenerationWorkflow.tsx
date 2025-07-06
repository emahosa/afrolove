
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Music, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useGenres } from '@/hooks/use-genres';
import { useSunoGeneration } from '@/hooks/use-suno-generation';
import { updateUserCredits } from '@/utils/credits';

interface MusicGenerationWorkflowProps {
  preSelectedGenre?: string;
  initialPrompt?: string;
}

export const MusicGenerationWorkflow: React.FC<MusicGenerationWorkflowProps> = ({
  preSelectedGenre = "",
  initialPrompt = ""
}) => {
  const { user } = useAuth();
  const { genres, loading: genresLoading } = useGenres();
  const { generateSong, isGenerating } = useSunoGeneration();
  
  const [prompt, setPrompt] = useState(initialPrompt);
  const [selectedGenre, setSelectedGenre] = useState(preSelectedGenre);
  const [songType, setSongType] = useState<'song' | 'instrumental'>('song');
  const [title, setTitle] = useState('');
  const [userCredits, setUserCredits] = useState(0);

  // Fetch user credits
  useEffect(() => {
    if (user) {
      fetchUserCredits();
    }
  }, [user]);

  // Set pre-selected values
  useEffect(() => {
    if (preSelectedGenre) {
      setSelectedGenre(preSelectedGenre);
    }
  }, [preSelectedGenre]);

  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  const fetchUserCredits = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      setUserCredits(data?.credits || 0);
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  };

  const handleGenerate = async () => {
    if (!user) {
      toast.error('Please log in to generate music');
      return;
    }

    if (!prompt.trim()) {
      toast.error('Please enter a prompt for your song');
      return;
    }

    if (prompt.length > 99) {
      toast.error('Prompt must be 99 characters or less');
      return;
    }

    if (userCredits < 1) {
      toast.error('Insufficient credits. Please purchase more credits to continue.');
      return;
    }

    try {
      const selectedGenreData = genres.find(g => g.id === selectedGenre);
      const genrePrompt = selectedGenreData?.prompt_template || '';
      
      const finalPrompt = genrePrompt ? `${genrePrompt} ${prompt}` : prompt;
      
      await generateSong({
        prompt: finalPrompt,
        title: title || 'Untitled Song',
        genre_id: selectedGenre || null,
        type: songType,
        credits_used: 1
      });

      // Update credits locally
      await updateUserCredits(user.id, -1);
      setUserCredits(prev => prev - 1);
      
      // Clear form
      setPrompt('');
      setTitle('');
      if (!preSelectedGenre) {
        setSelectedGenre('');
      }
      
      toast.success('Song generation started! Check your library for the result.');
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate song');
    }
  };

  const isFormValid = prompt.trim() && prompt.length <= 99;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Song Title (Optional)</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter song title..."
            maxLength={50}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select value={songType} onValueChange={(value: 'song' | 'instrumental') => setSongType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="song">Song (with lyrics)</SelectItem>
              <SelectItem value="instrumental">Instrumental</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="genre">Genre {preSelectedGenre && "(Pre-selected)"}</Label>
        <Select 
          value={selectedGenre} 
          onValueChange={setSelectedGenre}
          disabled={genresLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a genre (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No specific genre</SelectItem>
            {genres.map((genre) => (
              <SelectItem key={genre.id} value={genre.id}>
                {genre.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="prompt">
          Prompt {initialPrompt && "(Pre-filled)"}
          <span className="text-sm text-muted-foreground ml-2">
            ({prompt.length}/99 characters)
          </span>
        </Label>
        <Textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the music you want to create..."
          className="min-h-[100px]"
          maxLength={99}
        />
        {prompt.length > 99 && (
          <p className="text-sm text-red-500 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            Prompt must be 99 characters or less
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-sm">
            <Music className="w-4 h-4 mr-2" />
            Generation Cost
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span>Available Credits: {userCredits}</span>
            <span>Cost: 1 credit</span>
          </div>
          {userCredits < 1 && (
            <p className="text-sm text-red-500 mt-2">
              Insufficient credits. Please purchase more to continue.
            </p>
          )}
        </CardContent>
      </Card>

      <Button
        onClick={handleGenerate}
        disabled={!isFormValid || isGenerating || userCredits < 1}
        className="w-full"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Music className="w-4 h-4 mr-2" />
            Generate Song (1 Credit)
          </>
        )}
      </Button>
    </div>
  );
};
