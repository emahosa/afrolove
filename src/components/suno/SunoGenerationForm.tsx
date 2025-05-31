import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Music, Mic, AlertCircle, FileText } from 'lucide-react';
import { useSunoGeneration, SunoGenerationRequest } from '@/hooks/use-suno-generation';
import { useGenres } from '@/hooks/use-genres';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SunoGenerationFormProps {
  onSuccess?: (taskId: string) => void;
  requestId?: string;
}

type GenerationMode = 'prompt' | 'lyrics';
type ModelType = 'V3_5' | 'V4' | 'V4_5';

interface FormData {
  prompt: string;
  style: string;
  title: string;
  instrumental: boolean;
  model: ModelType;
  negativeTags: string;
}

export const SunoGenerationForm = ({ onSuccess, requestId }: SunoGenerationFormProps) => {
  const { user } = useAuth();
  const { genres } = useGenres();
  const { generateSong, generateLyrics, isGenerating, generationStatus } = useSunoGeneration();
  
  const [mode, setMode] = useState<GenerationMode>('prompt');
  const [formData, setFormData] = useState<FormData>({
    prompt: '',
    style: '',
    title: '',
    instrumental: false,
    model: 'V4_5',
    negativeTags: ''
  });

  const getCharacterLimits = () => {
    if (mode === 'prompt') {
      return { prompt: 400, style: 0, title: 0 };
    }
    // Lyric Input Mode
    const promptLimit = formData.model === 'V4_5' ? 5000 : 3000;
    const styleLimit = formData.model === 'V4_5' ? 1000 : 200;
    return { prompt: promptLimit, style: styleLimit, title: 80 };
  };

  const limits = getCharacterLimits();

  const validateForm = (): string | null => {
    if (!formData.prompt.trim()) {
      return 'Prompt is required';
    }

    if (formData.prompt.length > limits.prompt) {
      return `Prompt is too long. Maximum ${limits.prompt} characters for ${mode === 'prompt' ? 'Prompt Mode' : 'Lyric Input Mode'} with ${formData.model}`;
    }

    if (mode === 'lyrics') {
      if (!formData.style.trim()) {
        return 'Style is required for Lyric Input Mode';
      }
      if (!formData.title.trim()) {
        return 'Title is required for Lyric Input Mode';
      }
      if (formData.style.length > limits.style) {
        return `Style description is too long. Maximum ${limits.style} characters for ${formData.model}`;
      }
      if (formData.title.length > 80) {
        return 'Title must be 80 characters or less';
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to generate songs');
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const request: SunoGenerationRequest = {
      prompt: formData.prompt,
      instrumental: formData.instrumental,
      customMode: mode === 'lyrics',
      model: formData.model,
      requestId
    };

    // Add fields based on mode
    if (mode === 'lyrics') {
      request.style = formData.style;
      request.title = formData.title;
      if (formData.negativeTags) {
        request.negativeTags = formData.negativeTags;
      }
    }

    const taskId = await generateSong(request);
    if (taskId && onSuccess) {
      onSuccess(taskId);
    }
  };

  const handleGenerateLyrics = async () => {
    if (!formData.prompt.trim()) {
      toast.error('Please enter a prompt to generate lyrics');
      return;
    }

    try {
      const result = await generateLyrics(formData.prompt);
      if (result) {
        toast.success('Lyrics generated successfully!');
        // You could handle the generated lyrics here
        console.log('Generated lyrics:', result);
      }
    } catch (error) {
      console.error('Error generating lyrics:', error);
    }
  };

  const getPromptPlaceholder = () => {
    if (mode === 'prompt') {
      return 'e.g., A heartbreak Afrobeats anthem about lost love in Lagos...';
    }
    return 'Paste your full song lyrics here...';
  };

  const isFormValid = () => {
    const validationError = validateForm();
    return !validationError && !isGenerating;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Generate Song with Suno AI
        </CardTitle>
        <CardDescription>
          Create high-quality songs using advanced AI. Choose between quick prompts or full lyrics input.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Mode Selection */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Generation Mode</Label>
          <RadioGroup 
            value={mode} 
            onValueChange={(value) => {
              setMode(value as GenerationMode);
              // Reset form data when switching modes
              setFormData(prev => ({
                ...prev,
                prompt: '',
                style: '',
                title: ''
              }));
            }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="space-y-1">
              <RadioGroupItem value="prompt" id="prompt" className="peer sr-only" />
              <Label
                htmlFor="prompt"
                className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-card p-4 cursor-pointer transition-all duration-500 ease-out transform hover:scale-105 hover:shadow-xl hover:border-yellow-400 hover:bg-yellow-50 peer-data-[state=checked]:border-yellow-500 peer-data-[state=checked]:bg-yellow-100 peer-data-[state=checked]:text-yellow-900 peer-data-[state=checked]:scale-110 peer-data-[state=checked]:shadow-2xl peer-data-[state=checked]:shadow-yellow-300"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 mb-2 transition-all duration-500 peer-data-[state=checked]:bg-yellow-200 peer-data-[state=checked]:scale-125 hover:bg-yellow-100">
                  <Mic className="h-5 w-5 text-blue-600 transition-colors duration-500 peer-data-[state=checked]:text-yellow-700 hover:text-yellow-600" />
                </div>
                <div className="font-medium transition-all duration-500 peer-data-[state=checked]:font-bold peer-data-[state=checked]:text-yellow-900">🎨 Prompt Mode</div>
                <div className="text-xs text-muted-foreground text-center transition-colors duration-500 peer-data-[state=checked]:text-yellow-700">
                  Short creative prompt (max 400 chars)
                </div>
              </Label>
            </div>
            
            <div className="space-y-1">
              <RadioGroupItem value="lyrics" id="lyrics" className="peer sr-only" />
              <Label
                htmlFor="lyrics"
                className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-card p-4 cursor-pointer transition-all duration-500 ease-out transform hover:scale-105 hover:shadow-xl hover:border-yellow-400 hover:bg-yellow-50 peer-data-[state=checked]:border-yellow-500 peer-data-[state=checked]:bg-yellow-100 peer-data-[state=checked]:text-yellow-900 peer-data-[state=checked]:scale-110 peer-data-[state=checked]:shadow-2xl peer-data-[state=checked]:shadow-yellow-300"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 mb-2 transition-all duration-500 peer-data-[state=checked]:bg-yellow-200 peer-data-[state=checked]:scale-125 hover:bg-yellow-100">
                  <Music className="h-5 w-5 text-purple-600 transition-colors duration-500 peer-data-[state=checked]:text-yellow-700 hover:text-yellow-600" />
                </div>
                <div className="font-medium transition-all duration-500 peer-data-[state=checked]:font-bold peer-data-[state=checked]:text-yellow-900">✍️ Lyric Input Mode</div>
                <div className="text-xs text-muted-foreground text-center transition-colors duration-500 peer-data-[state=checked]:text-yellow-700">
                  Full song lyrics (max {formData.model === 'V4_5' ? '5000' : '3000'} chars)
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model" className="text-base font-medium">AI Model</Label>
            <Select 
              value={formData.model} 
              onValueChange={(value: ModelType) => setFormData(prev => ({ ...prev, model: value }))}
            >
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

          {/* Prompt/Lyrics Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="prompt" className="text-base font-medium">
                {mode === 'prompt' ? 'Song Description' : 'Song Lyrics'}
              </Label>
              {mode === 'prompt' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateLyrics}
                  disabled={!formData.prompt.trim() || isGenerating}
                  className="flex items-center gap-1"
                >
                  <FileText className="h-3 w-3" />
                  Generate Lyrics
                </Button>
              )}
            </div>
            <Textarea
              id="prompt"
              placeholder={getPromptPlaceholder()}
              value={formData.prompt}
              onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
              className={`min-h-[120px] ${formData.prompt.length > limits.prompt ? 'border-red-500' : ''}`}
            />
            <div className="flex justify-between text-sm">
              <span className={formData.prompt.length > limits.prompt ? 'text-red-500' : 'text-muted-foreground'}>
                {formData.prompt.length}/{limits.prompt} characters
              </span>
              {formData.prompt.length > limits.prompt && (
                <span className="text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Character limit exceeded
                </span>
              )}
            </div>
          </div>

          {/* Genre/Style Selection - Required for Lyric Input Mode */}
          {mode === 'lyrics' && (
            <div className="space-y-2">
              <Label htmlFor="style" className="text-base font-medium">
                Genre/Style <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.style} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, style: value }))}
              >
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
              {formData.style && (
                <div className="text-sm text-muted-foreground">
                  {formData.style.length}/{limits.style} characters
                </div>
              )}
            </div>
          )}

          {/* Song Title - Required for Lyric Input Mode */}
          {mode === 'lyrics' && (
            <div className="space-y-2">
              <Label htmlFor="title" className="text-base font-medium">
                Song Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Enter song title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                maxLength={80}
                className={formData.title.length > 80 ? 'border-red-500' : ''}
              />
              <div className="text-sm text-muted-foreground">
                {formData.title.length}/80 characters
              </div>
            </div>
          )}

          {/* Instrumental Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="instrumental"
              checked={formData.instrumental}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, instrumental: checked }))}
            />
            <Label htmlFor="instrumental">Generate instrumental only (no vocals)</Label>
          </div>

          {/* Negative Tags - Only for Lyric Input Mode */}
          {mode === 'lyrics' && (
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
          )}

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
            disabled={!isFormValid()}
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
