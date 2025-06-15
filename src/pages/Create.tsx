
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, Loader2, Info } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSunoGeneration, SunoGenerationRequest } from "@/hooks/use-suno-generation";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CustomSongCreation from "@/components/CustomSongCreation";
import { useGenres, Genre } from "@/hooks/use-genres";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type CreationMode = 'prompt' | 'lyrics';

const Create = () => {
  const [creationMode, setCreationMode] = useState<CreationMode>("prompt");
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<Genre | null>(null);

  const { user } = useAuth();
  const { generateSong, isGenerating } = useSunoGeneration();
  const { genres, loading: genresLoading } = useGenres();

  const handleGenerate = async () => {
    if (!selectedGenre) {
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

    const userPrompt = prompt;
    const adminPrompt = selectedGenre.prompt_template;

    const request: SunoGenerationRequest = {
      prompt: creationMode === 'prompt' ? `${adminPrompt}, ${userPrompt}` : userPrompt,
      customMode: creationMode === 'lyrics',
      instrumental,
      title: creationMode === 'lyrics' ? title : undefined,
      style: creationMode === 'lyrics' ? `${adminPrompt}, ${selectedGenre.name}` : undefined,
      model: 'V4_5',
    };

    const taskId = await generateSong(request);
    if (taskId) {
      setPrompt("");
      setTitle("");
      // Note: Not resetting genre on purpose for easier subsequent creations
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Create Music</h1>
      <p className="text-muted-foreground mb-6">Generate high-quality songs using our AI tools</p>
      
      <Tabs defaultValue="suno" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="suno">Create with Suno</TabsTrigger>
          <TabsTrigger value="custom">Create Custom Song</TabsTrigger>
        </TabsList>
        <TabsContent value="suno" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Song Generation</CardTitle>
              <CardDescription>Follow the steps below to create your song with Suno.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Step 1: Choose Creation Mode</h3>
                <RadioGroup value={creationMode} onValueChange={(v) => setCreationMode(v as CreationMode)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <RadioGroupItem value="prompt" id="prompt" className="peer sr-only" />
                    <Label htmlFor="prompt" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                      Prompt Mode
                      <span className="text-xs font-normal text-muted-foreground">Simple description</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="lyrics" id="lyrics" className="peer sr-only" />
                    <Label htmlFor="lyrics" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                      Lyrics Mode
                      <span className="text-xs font-normal text-muted-foreground">Use your own lyrics</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Step 2: Select a Genre <span className="text-destructive">*</span></h3>
                {genresLoading ? (
                  <div className="flex items-center justify-center h-24 rounded-lg border border-dashed">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading genres...</span>
                  </div>
                ) : (
                  <RadioGroup 
                      value={selectedGenre?.id}
                      onValueChange={(id) => setSelectedGenre(genres.find(g => g.id === id) || null)}
                      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                  >
                    {genres.map((genre) => (
                      <TooltipProvider key={genre.id} delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <RadioGroupItem value={genre.id} id={`genre-${genre.id}`} className="peer sr-only" />
                              <Label htmlFor={`genre-${genre.id}`} className={cn(
                                "flex items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover p-3 h-full cursor-pointer",
                                "hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary text-center"
                              )}>
                                <Music className="h-4 w-4 shrink-0" />
                                <span className="font-semibold flex-grow">{genre.name}</span>
                              </Label>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-xs text-center">
                              <p className="font-semibold">{genre.description || "No description."}</p>
                              <p className="text-xs text-muted-foreground mt-1 italic">Base prompt: "{genre.prompt_template}"</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </RadioGroup>
                )}
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Step 3: Add Song Details</h3>
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
                    placeholder={creationMode === 'prompt' ? "e.g., a vibrant afrobeats song about celebrating life" : "Paste your full lyrics here, like:\n[Verse 1]\n...\n[Chorus]\n..."}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[150px]"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Step 4: Generate Your Song</h3>
                <div className="flex items-center space-x-2">
                  <Switch id="instrumental" checked={instrumental} onCheckedChange={setInstrumental} />
                  <Label htmlFor="instrumental">Generate instrumental only</Label>
                </div>

                <Button onClick={handleGenerate} disabled={isGenerating || !selectedGenre} className="w-full" size="lg">
                  {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Music className="mr-2 h-4 w-4" />}
                  Generate Song (5 Credits)
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  {!selectedGenre && "Please select a genre to enable generation. "}
                  Generation takes 1-2 minutes.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="custom">
          <CustomSongCreation />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Create;
