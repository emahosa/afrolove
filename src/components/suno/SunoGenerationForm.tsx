
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Music, Mic } from 'lucide-react';
import { useSunoGeneration, SunoGenerationRequest } from '@/hooks/use-suno-generation';
import { useGenres } from '@/hooks/use-genres';
import { useAuth } from '@/contexts/AuthContext';

interface SunoGenerationFormProps {
  onSuccess?: (taskId: string) => void;
  requestId?: string;
}

export const SunoGenerationForm = ({ onSuccess, requestId }: SunoGenerationFormProps) => {
  const { user } = useAuth();
  const { genres } = useGenres();
  const { generateSong, isGenerating, generationStatus } = useSunoGeneration();
  
  const [mode, setMode] = useState<'prompt' | 'lyrics'>('prompt');
  const [formData, setFormData] = useState({
    prompt: '',
    style: '',
    title: '',
    instrumental: false,
    model: 'V4_5' as const,
    negativeTags: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      return;
    }

    if (!formData.prompt.trim()) {
      return;
    }

    if (!formData.style) {
      return;
    }

    const request: SunoGenerationRequest = {
      prompt: formData.prompt,
      style: formData.style,
      title: formData.title || undefined,
      instrumental: formData.instrumental,
      customMode: mode === 'lyrics',
      model: formData.model,
      negativeTags: formData.negativeTags || undefined,
      requestId
    };

    const taskId = await generateSong(request);
    if (taskId && onSuccess) {
      onSuccess(taskId);
    }
  };

  const getPromptPlaceholder = () => {
    if (mode === 'prompt') {
      return 'e.g., A heartbreak Afrobeats anthem about lost love in Lagos...';
    }
    return 'Paste your full song lyrics here...';
  };

  const getCharacterLimit = () => {
    if (mode === 'prompt') return 400;
    return formData.model === 'V4_5' ? 5000 : 3000;
  };

  const isOverLimit = formData.prompt.length > getCharacterLimit();

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Generate Song with Suno AI
        </CardTitle>
        <CardDescription>
          Create high-quality songs using advanced AI. Choose between quick prompts or full lyrics.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Mode Selection */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Generation Mode</Label>
          <RadioGroup 
            value={mode} 
            onValueChange={(value) => setMode(value as 'prompt' | 'lyrics')}
            className="grid grid-cols-2 gap-4"
          >
            <div className="space-y-1">
              <RadioGroupItem value="prompt" id="prompt" className="peer sr-only" />
              <Label
                htmlFor="prompt"
                className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 mb-2">
                  <Mic className="h-5 w-5 text-blue-600" />
                </div>
                <div className="font-medium">🎨 Prompt Mode</div>
                <div className="text-xs text-muted-foreground text-center">
                  Short creative prompt (max 400 chars)
                </div>
              </Label>
            </div>
            
            <div className="space-y-1">
              <RadioGroupItem value="lyrics" id="lyrics" className="peer sr-only" />
              <Label
                htmlFor="lyrics"
                className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 mb-2">
                  <Music className="h-5 w-5 text-purple-600" />
                </div>
                <div className="font-medium">✍️ Lyric Input Mode</div>
                <div className="text-xs text-muted-foreground text-center">
                  Full song lyrics (max {formData.model === 'V4_5' ? '5000' : '3000'} chars)
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Prompt/Lyrics Input */}
          <div className="space-y-2">
            <Label htmlFor="prompt" className="text-base font-medium">
              {mode === 'prompt' ? 'Song Description' : 'Song Lyrics'}
            </Label>
            <Textarea
              id="prompt"
              placeholder={getPromptPlaceholder()}
              value={formData.prompt}
              onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
              className={`min-h-[120px] ${isOverLimit ? 'border-red-500' : ''}`}
              maxLength={getCharacterLimit()}
            />
            <div className="flex justify-between text-sm">
              <span className={isOverLimit ? 'text-red-500' : 'text-muted-foreground'}>
                {formData.prompt.length}/{getCharacterLimit()} characters
              </span>
              {isOverLimit && (
                <span className="text-red-500">Character limit exceeded</span>
              )}
            </div>
          </div>

          {/* Genre/Style Selection */}
          <div className="space-y-2">
            <Label htmlFor="style" className="text-base font-medium">Genre/Style</Label>
            <Select value={formData.style} onValueChange={(value) => setFormData(prev => ({ ...prev, style: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a genre..." />
              </SelectTrigger>
              <SelectContent>
                {genres.map((genre) => (
                  <SelectItem key={genre.id} value={genre.name}>
                    {genre.name}
                  </SelectItem>
                ))}
                <SelectItem value="Afrobeats">Afrobeats</SelectItem>
                <SelectItem value="R&B">R&B</SelectItem>
                <SelectItem value="Pop">Pop</SelectItem>
                <SelectItem value="Hip Hop">Hip Hop</SelectItem>
                <SelectItem value="Rock">Rock</SelectItem>
                <SelectItem value="Electronic">Electronic</SelectItem>
                <SelectItem value="Jazz">Jazz</SelectItem>
                <SelectItem value="Country">Country</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Song Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Song Title (Optional)</Label>
            <Input
              id="title"
              placeholder="Enter song title or leave blank for AI to generate"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model" className="text-base font-medium">AI Model</Label>
            <Select value={formData.model} onValueChange={(value) => setFormData(prev => ({ ...prev, model: value as any }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="V3_5">V3.5 - Stable, good structure</SelectItem>
                <SelectItem value="V4">V4 - High-quality audio</SelectItem>
                <SelectItem value="V4_5">V4.5 - Most advanced (recommended)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Instrumental Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="instrumental"
              checked={formData.instrumental}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, instrumental: checked }))}
            />
            <Label htmlFor="instrumental">Generate instrumental only (no vocals)</Label>
          </div>

          {/* Negative Tags */}
          <div className="space-y-2">
            <Label htmlFor="negativeTags">Negative Tags (Optional)</Label>
            <Input
              id="negativeTags"
              placeholder="e.g., no drums, no bass"
              value={formData.negativeTags}
              onChange={(e) => setFormData(prev => ({ ...prev, negativeTags: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Specify elements you don't want in the song
            </p>
          </div>

          {/* Generation Status */}
          {generationStatus && (
            <div className="p-4 bg-blue-50 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Generation Status: {generationStatus.status}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Task ID: {generationStatus.task_id}
              </div>
              {generationStatus.status === 'TEXT_SUCCESS' && (
                <p className="text-sm text-blue-600 mt-1">Lyrics generated, creating audio...</p>
              )}
              {generationStatus.status === 'FIRST_SUCCESS' && (
                <p className="text-sm text-blue-600 mt-1">First track ready, generating variations...</p>
              )}
            </div>
          )}

          <Button
            type="submit"
            disabled={isGenerating || !formData.prompt.trim() || !formData.style || isOverLimit}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Song...
              </>
            ) : (
              <>
                <Music className="mr-2 h-4 w-4" />
                Generate Song (5 Credits)
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Generation typically takes 1-2 minutes. You'll be notified when it's ready.
          </p>
        </form>
      </CardContent>
    </Card>
  );
};
