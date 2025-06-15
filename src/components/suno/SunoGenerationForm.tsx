
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Music } from 'lucide-react';
import { useSunoGeneration, SunoGenerationRequest } from '@/hooks/use-suno-generation';
import { toast } from 'sonner';
import { useGenres } from '@/hooks/use-genres';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SunoGenerationFormProps {
  onSuccess?: (taskId: string) => void;
}

type GenerationMode = 'prompt' | 'lyrics' | 'genre';

export const SunoGenerationForm = ({ onSuccess }: SunoGenerationFormProps) => {
  const { generateSong, isGenerating } = useSunoGeneration();
  const { genres, loading: genresLoading } = useGenres();
  
  const [mode, setMode] = useState<GenerationMode>('prompt');
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState('');
  const [instrumental, setInstrumental] = useState(false);
  const [selectedGenreId, setSelectedGenreId] = useState('');

  const handleModeChange = (value: string) => {
    setMode(value as GenerationMode);
    // Reset form fields on mode change
    setPrompt('');
    setTitle('');
    setStyle('');
    setSelectedGenreId('');
    setInstrumental(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'genre') {
      if (!selectedGenreId || !title.trim() || !prompt.trim()) {
        toast.error('Genre, Title, and your prompt are required for Genre Mode.');
        return;
      }
      const selectedGenre = genres.find(g => g.id === selectedGenreId);
      if (!selectedGenre) {
        toast.error('Selected genre not found.');
        return;
      }
      
      const fullPrompt = `${selectedGenre.prompt_template} ${prompt.trim()}`;
      
      const request: SunoGenerationRequest = {
        prompt: fullPrompt,
        customMode: true,
        instrumental,
        title: title.trim(),
        style: selectedGenre.name,
        model: 'V4_5',
      };

      const taskId = await generateSong(request);
      if (taskId) {
        handleModeChange('genre'); // Reset form
        if (onSuccess) onSuccess(taskId);
      }
    } else { // Handle 'prompt' and 'lyrics' modes
      if (!prompt.trim()) {
        toast.error('Prompt or lyrics cannot be empty.');
        return;
      }
      if (mode === 'lyrics' && (!title.trim() || !style.trim())) {
        toast.error('Title and Style are required for Lyrics Mode.');
        return;
      }

      const request: SunoGenerationRequest = {
        prompt,
        customMode: mode === 'lyrics',
        instrumental,
        title: mode === 'lyrics' ? title.trim() : undefined,
        style: mode === 'lyrics' ? style.trim() : undefined,
        model: 'V4_5',
      };

      const taskId = await generateSong(request);
      if (taskId) {
        // Reset form
        setPrompt('');
        setTitle('');
        setStyle('');
        if (onSuccess) {
          onSuccess(taskId);
        }
      }
    }
  };

  const getPromptLabel = () => {
    switch (mode) {
      case 'prompt': return 'Song Description';
      case 'lyrics': return 'Lyrics';
      case 'genre': return 'Your Prompt (add to genre)';
      default: return '';
    }
  }

  const getPromptPlaceholder = () => {
    switch (mode) {
      case 'prompt': return "e.g., a lo-fi hip hop track for studying";
      case 'lyrics': return "Paste full song lyrics here...";
      case 'genre': return "e.g., about a fun day at the beach (max 99 chars)";
      default: return '';
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Generate Song with Suno
        </CardTitle>
        <CardDescription>
          Create songs from a simple description, your own lyrics, or by using a genre.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <RadioGroup 
            value={mode} 
            onValueChange={handleModeChange}
            className="grid grid-cols-3 gap-4"
          >
            <div>
              <RadioGroupItem value="prompt" id="suno-prompt" className="peer sr-only" />
              <Label htmlFor="suno-prompt" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent peer-data-[state=checked]:border-primary h-full">
                Prompt Mode
                <span className="text-xs text-muted-foreground mt-1 text-center">Simple description</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="lyrics" id="suno-lyrics" className="peer sr-only" />
              <Label htmlFor="suno-lyrics" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent peer-data-[state=checked]:border-primary h-full">
                Lyrics Mode
                <span className="text-xs text-muted-foreground mt-1 text-center">Use your own lyrics</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="genre" id="suno-genre" className="peer sr-only" />
              <Label htmlFor="suno-genre" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent peer-data-[state=checked]:border-primary h-full">
                Genre Mode
                <span className="text-xs text-muted-foreground mt-1 text-center">Build on a genre</span>
              </Label>
            </div>
          </RadioGroup>

          {mode === 'lyrics' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="suno-title">Song Title <span className="text-red-500">*</span></Label>
                <Input id="suno-title" placeholder="e.g., City of Dreams" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="suno-style">Style / Genre <span className="text-red-500">*</span></Label>
                <Input id="suno-style" placeholder="e.g., Indie Pop" value={style} onChange={(e) => setStyle(e.target.value)} />
              </div>
            </div>
          )}

          {mode === 'genre' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="suno-genre-select">Genre <span className="text-red-500">*</span></Label>
                <Select value={selectedGenreId} onValueChange={setSelectedGenreId} disabled={genresLoading}>
                  <SelectTrigger id="suno-genre-select">
                    <SelectValue placeholder={genresLoading ? "Loading genres..." : "Select a genre"} />
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
                <Label htmlFor="suno-title-genre">Song Title <span className="text-red-500">*</span></Label>
                <Input id="suno-title-genre" placeholder="e.g., Summer Vibes" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="suno-prompt-input">{getPromptLabel()} <span className="text-red-500">*</span></Label>
            <Textarea
              id="suno-prompt-input"
              placeholder={getPromptPlaceholder()}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[150px]"
              maxLength={mode === 'genre' ? 99 : undefined}
            />
            {mode === 'genre' && (
              <p className="text-sm text-muted-foreground text-right">{prompt.length}/99</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="suno-instrumental"
              checked={instrumental}
              onCheckedChange={setInstrumental}
            />
            <Label htmlFor="suno-instrumental">Generate instrumental only</Label>
          </div>

          <Button type="submit" disabled={isGenerating} className="w-full">
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Music className="mr-2 h-4 w-4" />
                Generate Song (5 Credits)
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
