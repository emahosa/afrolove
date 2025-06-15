
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, Loader2, Wand2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSunoGeneration, SunoGenerationRequest } from "@/hooks/use-suno-generation";
import { useAuth } from "@/contexts/AuthContext";
import { useGenres } from "@/hooks/use-genres";

type CreationMode = 'prompt' | 'lyrics';

const SunoCreation = () => {
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

    if (!prompt.trim()) {
      toast.error(`Please enter a ${creationMode === 'prompt' ? 'description' : 'lyrics'}.`);
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

    const selectedGenre = genres.find(g => g.id === selectedGenreId);
    if (!selectedGenre) {
      toast.error("Selected genre not found. Please try again.");
      return;
    }
    
    const adminPrompt = selectedGenre.prompt_template || "";
    const finalPrompt = `${adminPrompt} ${prompt}`;

    const request: SunoGenerationRequest = {
      prompt: finalPrompt,
      style: selectedGenre.name,
      customMode: creationMode === 'lyrics',
      instrumental,
      title: creationMode === 'lyrics' ? title : undefined,
      model: 'V4_5',
    };

    const taskId = await generateSong(request);
    if (taskId) {
      setPrompt("");
      setTitle("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          AI Song Generation
        </CardTitle>
        <CardDescription>
          Create songs from a simple description or provide your own lyrics.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="font-semibold">1. Choose a Genre <span className="text-destructive">*</span></Label>
          {genresLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <RadioGroup value={selectedGenreId} onValueChange={setSelectedGenreId} className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {genres.map((genre) => (
                <div key={genre.id}>
                  <RadioGroupItem value={genre.id} id={genre.id} className="peer sr-only" />
                  <Label htmlFor={genre.id} className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                    {genre.name}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>

        <div className="space-y-2">
          <Label className="font-semibold">2. Choose a Mode</Label>
          <RadioGroup value={creationMode} onValueChange={(v) => setCreationMode(v as CreationMode)} className="grid grid-cols-2 gap-4">
            <div>
              <RadioGroupItem value="prompt" id="prompt" className="peer sr-only" />
              <Label htmlFor="prompt" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                Prompt Mode
                <span className="text-xs font-normal text-muted-foreground">Simple description</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="lyrics" id="lyrics" className="peer sr-only" />
              <Label htmlFor="lyrics" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                Lyrics Mode
                <span className="text-xs font-normal text-muted-foreground">Use your own lyrics</span>
              </Label>
            </div>
          </RadioGroup>
        </div>
        
        {creationMode === 'lyrics' && (
          <div className="space-y-2">
            <Label htmlFor="title">Song Title <span className="text-destructive">*</span></Label>
            <Input id="title" placeholder="e.g., Midnight Rain" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="prompt-input">{creationMode === 'prompt' ? 'Song Description' : 'Your Lyrics'} <span className="text-destructive">*</span></Label>
          <Textarea
            id="prompt-input"
            placeholder={creationMode === 'prompt' ? "e.g., an upbeat pop song about summer nights" : "Paste your full lyrics here, like:\n[Verse 1]\n...\n[Chorus]\n..."}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[150px]"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch id="instrumental" checked={instrumental} onCheckedChange={setInstrumental} />
          <Label htmlFor="instrumental">Generate instrumental only</Label>
        </div>

        <Button onClick={handleGenerate} disabled={isGenerating || genresLoading} className="w-full" size="lg">
          {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Music className="mr-2 h-4 w-4" />}
          Generate Song (5 Credits)
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Generation takes 1-2 minutes. Your song will appear in the Library.
        </p>
      </CardContent>
    </Card>
  );
};

export default SunoCreation;
