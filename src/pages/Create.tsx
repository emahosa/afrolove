
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSunoGeneration, SunoGenerationRequest } from "@/hooks/use-suno-generation";
import { useGenres } from "@/hooks/use-genres";
import { useAuth } from "@/contexts/AuthContext";
import CustomSongCreation from "@/components/CustomSongCreation";

type CreationMode = 'prompt' | 'lyrics';

const AiSongGeneration = () => {
  const [creationMode, setCreationMode] = useState<CreationMode>("prompt");
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [selectedGenreId, setSelectedGenreId] = useState<string>("");

  const { user } = useAuth();
  const { generateSong, isGenerating } = useSunoGeneration();
  const { genres, loading: genresLoading } = useGenres();

  const handleGenerate = async () => {
    if (!selectedGenreId) {
      toast.error("Please select a genre.");
      return;
    }

    if (creationMode === 'prompt' && !prompt.trim()) {
      toast.error("Please enter a song description.");
      return;
    }

    if (creationMode === 'lyrics' && (!prompt.trim() || !title.trim())) {
      toast.error("Lyrics and Title are required for Lyrics Mode.");
      return;
    }

    if ((user?.credits || 0) < 5) {
      toast.error("Insufficient credits. Please purchase more to continue.");
      return;
    }

    const selectedGenre = genres.find(g => g.id === selectedGenreId);
    if (!selectedGenre) {
      toast.error("Selected genre not found. Please try again.");
      return;
    }

    const adminPrompt = selectedGenre.prompt_template;
    let request: SunoGenerationRequest;

    if (creationMode === 'prompt') {
      if (prompt.length > 99) {
        toast.error("Prompt cannot exceed 99 characters.");
        return;
      }
      request = {
        prompt: `${adminPrompt} ${prompt}`,
        customMode: false,
        instrumental,
        model: 'V4_5',
      };
    } else { // lyrics mode
      request = {
        prompt: prompt, // user lyrics
        customMode: true,
        instrumental,
        title: title,
        style: adminPrompt,
        model: 'V4_5',
      };
    }

    const taskId = await generateSong(request);
    if (taskId) {
      setPrompt("");
      setTitle("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>🎵 AI Song Generation</CardTitle>
        <CardDescription>
          Select a genre, choose a mode, and create a song with AI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        <div className="space-y-2">
          <Label htmlFor="genre">Genre <span className="text-destructive">*</span></Label>
          {genresLoading ? (
            <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading genres...</div>
          ) : (
            <Select value={selectedGenreId} onValueChange={setSelectedGenreId} disabled={genresLoading}>
              <SelectTrigger id="genre">
                <SelectValue placeholder="Select a genre" />
              </SelectTrigger>
              <SelectContent>
                {genres.map(genre => (
                  <SelectItem key={genre.id} value={genre.id}>{genre.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <RadioGroup value={creationMode} onValueChange={(v) => setCreationMode(v as CreationMode)} className="grid grid-cols-2 gap-4">
          <div>
            <RadioGroupItem value="prompt" id="prompt-mode" className="peer sr-only" />
            <Label htmlFor="prompt-mode" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
              Prompt Mode
              <span className="text-xs font-normal text-muted-foreground">Simple description</span>
            </Label>
          </div>
          <div>
            <RadioGroupItem value="lyrics" id="lyrics-mode" className="peer sr-only" />
            <Label htmlFor="lyrics-mode" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
              Lyrics Mode
              <span className="text-xs font-normal text-muted-foreground">Use your own lyrics</span>
            </Label>
          </div>
        </RadioGroup>

        {creationMode === 'lyrics' && (
          <div className="space-y-2">
            <Label htmlFor="title">Song Title <span className="text-destructive">*</span></Label>
            <Input id="title" placeholder="e.g., Midnight Rain" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="prompt-input">{creationMode === 'prompt' ? 'Song Description (max 99 chars)' : 'Lyrics'}</Label>
          <Textarea
            id="prompt-input"
            placeholder={creationMode === 'prompt' ? "e.g., a upbeat pop song about summer nights" : "Paste your full lyrics here..."}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[120px]"
            maxLength={creationMode === 'prompt' ? 99 : undefined}
          />
          {creationMode === 'prompt' && (
            <p className="text-xs text-muted-foreground text-right">{prompt.length}/99</p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Switch id="instrumental" checked={instrumental} onCheckedChange={setInstrumental} />
          <Label htmlFor="instrumental">Generate instrumental only</Label>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || genresLoading}
          className="w-full"
          size="lg"
        >
          {isGenerating || genresLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Music className="mr-2 h-4 w-4" />
          )}
          Generate Song (5 Credits)
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Generation takes 1-2 minutes. Your song will appear in the Library.
        </p>
      </CardContent>
    </Card>
  );
};

const Create = () => {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">Create Music</h1>
      <p className="text-muted-foreground mb-6">Generate songs with AI or work with our team for a custom track.</p>
      
      <Tabs defaultValue="ai-generation" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ai-generation">AI Song Generation</TabsTrigger>
          <TabsTrigger value="custom-song">Custom Song (with Team)</TabsTrigger>
        </TabsList>

        <TabsContent value="ai-generation" className="mt-6">
          <AiSongGeneration />
        </TabsContent>

        <TabsContent value="custom-song" className="mt-6">
          <CustomSongCreation />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Create;

