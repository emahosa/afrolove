
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

interface SunoGenerationFormProps {
  onSuccess?: (taskId: string) => void;
}

type GenerationMode = 'prompt' | 'lyrics';

export const SunoGenerationForm = ({ onSuccess }: SunoGenerationFormProps) => {
  const { generateSong, isGenerating } = useSunoGeneration();
  
  const [mode, setMode] = useState<GenerationMode>('prompt');
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState('');
  const [instrumental, setInstrumental] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      title: mode === 'lyrics' ? title : undefined,
      style: mode === 'lyrics' ? style : undefined,
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
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Generate Song with Suno
        </CardTitle>
        <CardDescription>
          Create songs from a simple description or provide your own lyrics.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <RadioGroup 
            value={mode} 
            onValueChange={(value) => setMode(value as GenerationMode)}
            className="grid grid-cols-2 gap-4"
          >
            <div>
              <RadioGroupItem value="prompt" id="suno-prompt" className="peer sr-only" />
              <Label htmlFor="suno-prompt" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent peer-data-[state=checked]:border-primary">
                Prompt Mode
              </Label>
            </div>
            <div>
              <RadioGroupItem value="lyrics" id="suno-lyrics" className="peer sr-only" />
              <Label htmlFor="suno-lyrics" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent peer-data-[state=checked]:border-primary">
                Lyrics Mode
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

          <div className="space-y-2">
            <Label htmlFor="suno-prompt-input">{mode === 'prompt' ? 'Song Description' : 'Lyrics'}</Label>
            <Textarea
              id="suno-prompt-input"
              placeholder={mode === 'prompt' ? "e.g., a lo-fi hip hop track for studying" : "Paste full song lyrics here..."}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[150px]"
            />
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
                Generate Song (20 Credits)
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
