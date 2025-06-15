
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

type CreationMode = 'prompt' | 'lyrics';

const MusicGenerationForm = () => {
  const [creationMode, setCreationMode] = useState<CreationMode>("prompt");
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [style, setStyle] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  
  const { user } = useAuth();
  const { generateSong, isGenerating } = useSunoGeneration();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt or lyrics.");
      return;
    }
    
    if (creationMode === 'lyrics' && (!title.trim() || !style.trim())) {
      toast.error("Title and Style are required for Lyrics Mode.");
      return;
    }

    if ((user?.credits || 0) < 5) {
      toast.error("Insufficient credits. Please purchase more to continue.");
      return;
    }

    const request: SunoGenerationRequest = {
      prompt: prompt,
      customMode: creationMode === 'lyrics',
      instrumental,
      title: creationMode === 'lyrics' ? title : undefined,
      style: creationMode === 'lyrics' ? style : undefined,
      model: 'V4_5',
    };

    const taskId = await generateSong(request);
    if (taskId) {
      setPrompt("");
      setTitle("");
      setStyle("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>🎵 AI Song Generation</CardTitle>
        <CardDescription>
          Create songs from a simple description or provide your own lyrics.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup value={creationMode} onValueChange={(v) => setCreationMode(v as CreationMode)} className="grid grid-cols-2 gap-4">
          <div>
            <RadioGroupItem value="prompt" id="prompt-form" className="peer sr-only" />
            <Label htmlFor="prompt-form" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
              Prompt Mode
              <span className="text-xs font-normal text-muted-foreground">Simple description</span>
            </Label>
          </div>
          <div>
            <RadioGroupItem value="lyrics" id="lyrics-form" className="peer sr-only" />
            <Label htmlFor="lyrics-form" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
              Lyrics Mode
              <span className="text-xs font-normal text-muted-foreground">Use your own lyrics</span>
            </Label>
          </div>
        </RadioGroup>

        {creationMode === 'lyrics' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title-form">Song Title <span className="text-destructive">*</span></Label>
              <Input id="title-form" placeholder="e.g., Midnight Rain" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="style-form">Style / Genre <span className="text-destructive">*</span></Label>
              <Input id="style-form" placeholder="e.g., Synthwave Pop" value={style} onChange={(e) => setStyle(e.target.value)} />
            </div>
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="prompt-input-form">{creationMode === 'prompt' ? 'Song Description' : 'Lyrics'}</Label>
          <Textarea
            id="prompt-input-form"
            placeholder={creationMode === 'prompt' ? "e.g., a upbeat pop song about summer nights" : "Paste your full lyrics here..."}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[120px]"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch id="instrumental-form" checked={instrumental} onCheckedChange={setInstrumental} />
          <Label htmlFor="instrumental-form">Generate instrumental only</Label>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
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

export default MusicGenerationForm;
