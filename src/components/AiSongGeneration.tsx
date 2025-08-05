
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Music, Sparkles, Wand2 } from "lucide-react";
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
    <div className="max-w-4xl mx-auto p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 min-h-screen">
      <Card className="shadow-2xl border-slate-800 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-violet-900/30 to-purple-900/30 rounded-t-lg">
          <div className="flex items-center justify-center space-x-3 mb-2">
            <Wand2 className="h-8 w-8 text-violet-400" />
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              AI Song Generation
            </CardTitle>
          </div>
          <CardDescription className="text-center text-lg text-slate-300">
            Create unique songs using AI. Enter a prompt and let the AI generate a song for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="prompt" className="text-slate-200 font-semibold text-base">Song Prompt</Label>
              <Textarea
                id="prompt"
                placeholder="Describe your song: e.g., A happy song about dancing in the rain"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="resize-none mt-2 bg-slate-800 border-slate-600 text-white focus:border-violet-500 focus:ring-violet-500 placeholder-slate-400"
              />
            </div>

            <div className="flex items-center space-x-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <input
                id="custom-mode"
                type="checkbox"
                checked={customMode}
                onChange={(e) => setCustomMode(e.target.checked)}
                className="w-5 h-5 rounded border-slate-600 text-violet-600 focus:ring-violet-500 focus:ring-offset-slate-900"
              />
              <Label htmlFor="custom-mode" className="text-slate-200 font-medium flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-violet-400" />
                <span>Enable Custom Mode</span>
              </Label>
            </div>

            {customMode && (
              <div className="space-y-4 p-4 bg-violet-950/20 rounded-lg border border-violet-800/30">
                <div>
                  <Label htmlFor="style" className="text-slate-200 font-semibold">Style</Label>
                  <Input
                    id="style"
                    placeholder="e.g., Afrobeat, Pop, Rock"
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="mt-2 bg-slate-800 border-slate-600 text-white focus:border-violet-500 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <Label htmlFor="title" className="text-slate-200 font-semibold">Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Dancing in the Rain"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-2 bg-slate-800 border-slate-600 text-white focus:border-violet-500 focus:ring-violet-500"
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="model" className="text-slate-200 font-semibold">AI Model</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-full mt-2 bg-slate-800 border-slate-600 text-white focus:border-violet-500 focus:ring-violet-500">
                  <SelectValue placeholder="Select Model" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="Afro Model 1" className="text-white hover:bg-slate-700">
                    {getModelDisplayName('V3_5')} - Stable & Structured
                  </SelectItem>
                  <SelectItem value="Afro Model 2" className="text-white hover:bg-slate-700">
                    {getModelDisplayName('V4')} - High Quality
                  </SelectItem>
                  <SelectItem value="Afro Model 3" className="text-white hover:bg-slate-700">
                    {getModelDisplayName('V4_5')} - Most Advanced
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <input
                id="instrumental"
                type="checkbox"
                checked={instrumental}
                onChange={(e) => setInstrumental(e.target.checked)}
                className="w-5 h-5 rounded border-slate-600 text-violet-600 focus:ring-violet-500 focus:ring-offset-slate-900"
              />
              <Label htmlFor="instrumental" className="text-slate-200 font-medium">
                Instrumental Only
              </Label>
            </div>
            
            <Button
              type="submit"
              disabled={isGenerating || !user || (user.credits || 0) < 20}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  Generating Your Song...
                </>
              ) : (
                <>
                  <Music className="mr-3 h-5 w-5" />
                  Generate Song (20 Credits)
                </>
              )}
            </Button>
            
            {user && (user.credits || 0) < 20 && (
              <div className="mt-6 p-4 bg-red-950/20 border border-red-800/30 rounded-lg">
                <p className="text-red-400 font-semibold">Insufficient Credits</p>
                <p className="text-red-300/80">You need at least 20 credits to generate a song. Purchase more credits to continue.</p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AiSongGeneration;
