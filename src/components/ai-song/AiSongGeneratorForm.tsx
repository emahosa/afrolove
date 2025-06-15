
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
import { useSunoGeneration, SunoGenerationRequest } from "@/hooks/use-suno-generation";
import { useAuth } from "@/contexts/AuthContext";
import { useGenres } from "@/hooks/use-genres";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CreationMode = 'prompt' | 'lyrics';

export const AiSongGeneratorForm = () => {
  const [creationMode, setCreationMode] = useState<CreationMode>("prompt");
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [genreId, setGenreId] = useState("");
  
  const { user } = useAuth();
  const { generateSong, isGenerating } = useSunoGeneration();
  const { genres, loading: genresLoading } = useGenres();

  const handleGenerate = async () => {
    if (!genreId) {
      toast.error("Please select a genre.");
      return;
    }
    
    if (!prompt.trim()) {
      toast.error("Please enter a prompt or lyrics.");
      return;
    }
    
    if (creationMode === 'lyrics' && !title.trim()) {
      toast.error("Title is required for Lyrics Mode.");
      return;
    }

    if ((user?.credits || 0) < 5) {
      toast.error("Insufficient credits. Please purchase more to continue.");
      return;
    }
    
    const selectedGenre = genres.find(g => g.id === genreId);
    if (!selectedGenre) {
      toast.error("Selected genre not found.");
      return;
    }

    const finalPrompt = (selectedGenre.prompt_template ? selectedGenre.prompt_template + ' ' : '') + prompt;

    const request: SunoGenerationRequest = {
      prompt: finalPrompt,
      customMode: creationMode === 'lyrics',
      instrumental,
      title: creationMode === 'lyrics' ? title : undefined,
      style: selectedGenre.name,
      model: 'V4_5',
    };

    const taskId = await generateSong(request);
    if (taskId) {
      setPrompt("");
      setTitle("");
      setGenreId("");
    }
  };

  const selectedGenreForPreview = genres.find(g => g.id === genreId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>🎵 AI Song Generation</CardTitle>
        <CardDescription>
          Create songs from a simple description or provide your own lyrics. Genre is required.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="genre">Genre <span className="text-destructive">*</span></Label>
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
          {selectedGenreForPreview?.prompt_template && (
            <p className="text-xs text-muted-foreground p-2 bg-muted rounded-md">
              <span className="font-semibold">Genre pre-prompt:</span> "{selectedGenreForPreview.prompt_template}"
            </p>
          )}
        </div>

        <RadioGroup value={creationMode} onValueChange={(v) => setCreationMode(v as CreationMode)} className="grid grid-cols-2 gap-4">
          <div>
            <RadioGroupItem value="prompt" id="prompt-mode-radio" className="peer sr-only" />
            <Label htmlFor="prompt-mode-radio" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
              Prompt Mode
              <span className="text-xs font-normal text-muted-foreground">Simple description</span>
            </Label>
          </div>
          <div>
            <RadioGroupItem value="lyrics" id="lyrics-mode-radio" className="peer sr-only" />
            <Label htmlFor="lyrics-mode-radio" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
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
          <Label htmlFor="prompt-input">{creationMode === 'prompt' ? 'Song Description' : 'Lyrics'} <span className="text-destructive">*</span></Label>
          <Textarea
            id="prompt-input"
            placeholder={creationMode === 'prompt' ? "e.g., an upbeat pop song about summer nights" : "Paste your full lyrics here..."}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[120px]"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch id="instrumental" checked={instrumental} onCheckedChange={setInstrumental} />
          <Label htmlFor="instrumental">Generate instrumental only</Label>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !genreId}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
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
