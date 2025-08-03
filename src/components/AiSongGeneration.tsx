import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Music } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/contexts/AuthContext";
import { useSunoGeneration, getModelDisplayName, getApiModelName } from "@/hooks/use-suno-generation";

const AiSongGeneration = () => {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("");
  const [title, setTitle] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [selectedModel, setSelectedModel] = useState('Afro Model 1');
  const { generateSong, isGenerating } = useSunoGeneration();
  const { user, updateUserCredits } = useAuth();

  useEffect(() => {
    if (customMode && !style) {
      setStyle("Afrobeat");
    }
  }, [customMode, style]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Please log in to generate songs");
      return;
    }

    if ((user.credits || 0) < 20) {
      toast.error("You need at least 20 credits to generate a song");
      return;
    }

    if (!prompt.trim()) {
      toast.error("Please enter a prompt for your song");
      return;
    }

    const taskId = await generateSong({
      prompt: prompt.trim(),
      style: customMode ? style : undefined,
      title: customMode ? title : undefined,
      instrumental,
      customMode,
      model: getApiModelName(selectedModel) as 'V3_5' | 'V4' | 'V4_5'
    });

    if (taskId) {
      updateUserCredits(-20);
      // Reset form after successful generation
      setPrompt('');
      setTitle('');
      setStyle('');
      setSelectedModel('Afro Model 1');
      setCustomMode(false);
      setInstrumental(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Song Generation</CardTitle>
          <CardDescription>
            Create unique songs using AI. Enter a prompt and let the AI generate a song for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                placeholder="Describe your song: e.g., A happy song about dancing in the rain"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Input
                id="custom-mode"
                type="checkbox"
                checked={customMode}
                onChange={(e) => setCustomMode(e.target.checked)}
              />
              <Label htmlFor="custom-mode" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
                Enable Custom Mode
              </Label>
            </div>

            {customMode && (
              <>
                <div>
                  <Label htmlFor="style">Style</Label>
                  <Input
                    id="style"
                    placeholder="e.g., Afrobeat, Pop, Rock"
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Dancing in the Rain"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="model">Model</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Afro Model 1">{getModelDisplayName('V3_5')}</SelectItem>
                  <SelectItem value="Afro Model 2">{getModelDisplayName('V4')}</SelectItem>
                  <SelectItem value="Afro Model 3">{getModelDisplayName('V4_5')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Input
                id="instrumental"
                type="checkbox"
                checked={instrumental}
                onChange={(e) => setInstrumental(e.target.checked)}
              />
              <Label htmlFor="instrumental" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
                Instrumental Only
              </Label>
            </div>
            
            <Button
              type="submit"
              disabled={isGenerating || !user || (user.credits || 0) < 20}
              className="w-full bg-gradient-to-r from-melody-primary to-melody-secondary hover:opacity-90"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Your Song...
                </>
              ) : (
                <>
                  <Music className="mr-2 h-4 w-4" />
                  Generate Song (20 Credits)
                </>
              )}
            </Button>
            
            {user && (user.credits || 0) < 20 && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-destructive font-semibold">Insufficient Credits</p>
                <p className="text-destructive/80">You need at least 20 credits to generate a song. Purchase more credits to continue.</p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AiSongGeneration;
