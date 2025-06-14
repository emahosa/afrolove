
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Music, Wand2, Settings, Clock, AlertCircle } from 'lucide-react';
import { useSunoGeneration } from '@/hooks/use-suno-generation';
import { useGenres } from '@/hooks/use-genres';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const MusicGenerationWorkflow = () => {
  const { user } = useAuth();
  const { genres } = useGenres();
  const { generateSong, isGenerating } = useSunoGeneration();

  const [formData, setFormData] = useState({
    prompt: '',
    title: '',
    style: '',
    model: 'V4_5' as 'V3_5' | 'V4' | 'V4_5',
    instrumental: false,
    customMode: false,
    negativeTags: ''
  });
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!formData.prompt.trim()) {
      toast.error('Please enter a prompt for your song');
      return;
    }

    if (formData.customMode && (!formData.style || !formData.title)) {
      toast.error('Style and title are required for custom mode');
      return;
    }

    setCurrentTaskId(null);

    const request = {
      prompt: formData.prompt,
      style: formData.style,
      title: formData.title,
      instrumental: formData.instrumental,
      customMode: formData.customMode,
      model: formData.model,
      negativeTags: formData.negativeTags
    };

    const taskId = await generateSong(request);
    if (taskId) {
      setCurrentTaskId(taskId);
      toast.success('🎵 Generation started! Your song will appear in your library when ready.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Generation Form */}
      <Tabs defaultValue="simple" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="simple" className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Simple Mode
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Advanced Mode
          </TabsTrigger>
        </TabsList>

        <TabsContent value="simple">
          <Card>
            <CardHeader>
              <CardTitle>Quick Generation</CardTitle>
              <CardDescription>
                Describe your song and let AI handle the rest
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Song Description</Label>
                <Textarea
                  id="prompt"
                  placeholder="e.g., A heartfelt acoustic ballad about summer love with gentle guitar melodies..."
                  value={formData.prompt}
                  onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                  className="min-h-[100px]"
                />
                <div className="text-sm text-muted-foreground">
                  {formData.prompt.length}/400 characters
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model">AI Model</Label>
                  <Select 
                    value={formData.model} 
                    onValueChange={(value: 'V3_5' | 'V4' | 'V4_5') => 
                      setFormData(prev => ({ ...prev, model: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="V4_5">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Recommended</Badge>
                          V4.5 - Most Advanced
                        </div>
                      </SelectItem>
                      <SelectItem value="V4">V4 - High Quality</SelectItem>
                      <SelectItem value="V3_5">V3.5 - Fast & Stable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="instrumental"
                    checked={formData.instrumental}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, instrumental: checked }))
                    }
                  />
                  <Label htmlFor="instrumental">Instrumental Only</Label>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !formData.prompt.trim()}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Generating Song...
                  </>
                ) : (
                  <>
                    <Music className="mr-2 h-4 w-4" />
                    Generate Song (5 Credits)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Generation</CardTitle>
              <CardDescription>
                Full control over your song generation parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Song Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter song title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="style">Genre/Style</Label>
                  <Select 
                    value={formData.style} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, style: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select genre..." />
                    </SelectTrigger>
                    <SelectContent>
                      {genres.map((genre) => (
                        <SelectItem key={genre.id} value={genre.name}>
                          {genre.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="Pop">Pop</SelectItem>
                      <SelectItem value="Rock">Rock</SelectItem>
                      <SelectItem value="Hip Hop">Hip Hop</SelectItem>
                      <SelectItem value="Electronic">Electronic</SelectItem>
                      <SelectItem value="Jazz">Jazz</SelectItem>
                      <SelectItem value="Country">Country</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lyrics">Lyrics or Description</Label>
                <Textarea
                  id="lyrics"
                  placeholder="Enter full lyrics or detailed description..."
                  value={formData.prompt}
                  onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                  className="min-h-[120px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="negativeTags">Exclude Elements (Optional)</Label>
                <Input
                  id="negativeTags"
                  placeholder="e.g., no drums, no bass, no vocals"
                  value={formData.negativeTags}
                  onChange={(e) => setFormData(prev => ({ ...prev, negativeTags: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="customMode"
                    checked={formData.customMode}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, customMode: checked }))
                    }
                  />
                  <Label htmlFor="customMode">Lyric Input Mode</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="instrumental-adv"
                    checked={formData.instrumental}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, instrumental: checked }))
                    }
                  />
                  <Label htmlFor="instrumental-adv">Instrumental</Label>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !formData.prompt.trim()}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Generating Song...
                  </>
                ) : (
                  <>
                    <Music className="mr-2 h-4 w-4" />
                    Generate Song (5 Credits)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status Panel */}
      {isGenerating && currentTaskId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 animate-spin" />
              Generation in Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                AI is composing your song. It will appear in your library once complete.
              </p>
              <p className="text-xs font-mono bg-muted p-2 rounded">
                Task ID: {currentTaskId}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MusicGenerationWorkflow;
