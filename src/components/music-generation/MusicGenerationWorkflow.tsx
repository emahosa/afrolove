
import { useState, useEffect } from "react";
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
import { useSunoGeneration, SunoGenerationRequest, getModelDisplayName, getApiModelName } from "@/hooks/use-suno-generation";
import { useGenres } from "@/hooks/use-genres";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type CreationMode = 'prompt' | 'lyrics';

interface MusicGenerationWorkflowProps {
  preSelectedGenre?: string;
  initialPrompt?: string;
  templateId?: string;
}

export const MusicGenerationWorkflow = ({ preSelectedGenre, initialPrompt, templateId }: MusicGenerationWorkflowProps) => {
  const [creationMode, setCreationMode] = useState<CreationMode>("prompt");
  const [prompt, setPrompt] = useState(initialPrompt || "");
  const [title, setTitle] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [selectedGenreId, setSelectedGenreId] = useState<string>(preSelectedGenre || "");
  const [selectedModel, setSelectedModel] = useState<string>("Afro Model 3");
  const [templateData, setTemplateData] = useState<any>(null);
  const [templatePrompt, setTemplatePrompt] = useState("");

  const { user } = useAuth();
  const { generateSong, isGenerating } = useSunoGeneration();
  const { genres, loading: genresLoading } = useGenres();

  const availableModels = [
    { value: "Afro Model 1", label: "Afro Model 1" },
    { value: "Afro Model 2", label: "Afro Model 2" },
    { value: "Afro Model 3", label: "Afro Model 3" }
  ];

  // Load template data if templateId is provided
  useEffect(() => {
    if (templateId) {
      loadTemplateData();
    }
  }, [templateId]);

  const loadTemplateData = async () => {
    if (!templateId) return;

    try {
      const { data, error } = await supabase
        .from('genre_templates')
        .select(`
          *,
          genres(name)
        `)
        .eq('id', templateId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error loading template:', error);
        return;
      }

      if (data) {
        setTemplateData(data);
        setSelectedGenreId(data.genre_id);
        setTemplatePrompt(data.user_prompt_guide || "");
        setPrompt(data.user_prompt_guide || "");
      }
    } catch (error) {
      console.error('Error loading template:', error);
    }
  };

  // Set initial values when props change
  useEffect(() => {
    if (preSelectedGenre && !templateId) {
      setSelectedGenreId(preSelectedGenre);
    }
  }, [preSelectedGenre, templateId]);

  useEffect(() => {
    if (initialPrompt && !templateId) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt, templateId]);

  const handleGenerate = async () => {
    if (!selectedGenreId && !templateData) {
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

    if (!user) {
      toast.error("Please log in to generate songs.");
      return;
    }

    // Check user credits
    if ((user.credits || 0) < 20) {
      toast.error("Insufficient credits. Please purchase more to continue.");
      return;
    }

    let adminPrompt = "";
    
    if (templateData) {
      // Use template's admin prompt
      adminPrompt = templateData.admin_prompt || "";
    } else if (selectedGenreId) {
      // Use genre's prompt template
      const selectedGenre = genres.find(g => g.id === selectedGenreId);
      adminPrompt = selectedGenre?.prompt_template || selectedGenre?.description || "";
    }

    const apiModelName = getApiModelName(selectedModel) as 'V3_5' | 'V4' | 'V4_5';
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
        model: apiModelName,
      };
    } else { // lyrics mode
      request = {
        prompt: prompt, // user lyrics
        customMode: true,
        instrumental,
        title: title,
        style: adminPrompt,
        model: apiModelName,
      };
    }

    const taskId = await generateSong(request);
    if (taskId) {
      setPrompt(templateData ? templatePrompt : "");
      setTitle("");
      toast.success("Song generation started! Check your library for the result.");
    }
  };

  const displayName = templateData ? templateData.template_name : 
    (selectedGenreId ? genres.find(g => g.id === selectedGenreId)?.name : "");

  return (
    <div className="space-y-6 text-white">
      {templateData && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-lg">Using Template: {templateData.template_name}</CardTitle>
            <CardDescription>
              Genre: {templateData.genres?.name}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {!templateData && (
        <div className="space-y-2">
          <Label htmlFor="genre" className="text-gray-300">Genre <span className="text-red-500">*</span></Label>
          {genresLoading ? (
            <div className="flex items-center text-sm text-gray-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              Loading genres...
            </div>
          ) : (
            <Select value={selectedGenreId} onValueChange={setSelectedGenreId} disabled={genresLoading}>
              <SelectTrigger id="genre" className="bg-black/20 border-white/20">
                <SelectValue placeholder="Select a genre" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/20 text-white">
                {genres.map(genre => (
                  <SelectItem key={genre.id} value={genre.id} className="focus:bg-purple-500/50">
                    {genre.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="model" className="text-gray-300">AI Model</Label>
        <Select value={selectedModel} onValueChange={setSelectedModel}>
          <SelectTrigger id="model" className="bg-black/20 border-white/20">
            <SelectValue placeholder="Select an AI model" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-white/20 text-white">
            {availableModels.map(model => (
              <SelectItem key={model.value} value={model.value} className="focus:bg-purple-500/50">
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <RadioGroup value={creationMode} onValueChange={(v) => setCreationMode(v as CreationMode)} className="grid grid-cols-2 gap-4">
        <div>
          <RadioGroupItem value="prompt" id="prompt-mode" className="peer sr-only" />
          <Label htmlFor="prompt-mode" className="flex flex-col items-center justify-center rounded-2xl border border-purple-400/30 bg-white/10 p-4 hover:bg-purple-400/20 peer-data-[state=checked]:border-purple-400 [&:has([data-state=checked])]:border-purple-400 cursor-pointer transition-colors">
            Prompt Mode
            <span className="text-xs font-normal text-gray-400">Simple description</span>
          </Label>
        </div>
        <div>
          <RadioGroupItem value="lyrics" id="lyrics-mode" className="peer sr-only" />
          <Label htmlFor="lyrics-mode" className="flex flex-col items-center justify-center rounded-2xl border border-purple-400/30 bg-white/10 p-4 hover:bg-purple-400/20 peer-data-[state=checked]:border-purple-400 [&:has([data-state=checked])]:border-purple-400 cursor-pointer transition-colors">
            Lyrics Mode
            <span className="text-xs font-normal text-gray-400">Use your own lyrics</span>
          </Label>
        </div>
      </RadioGroup>

      {creationMode === 'lyrics' && (
        <div className="space-y-2">
          <Label htmlFor="title" className="text-gray-300">Song Title <span className="text-red-500">*</span></Label>
          <Input id="title" placeholder="e.g., Midnight Rain" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-black/20 border-white/20 text-white placeholder-gray-500" />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="prompt-input" className="text-gray-300">
          {creationMode === 'prompt' ? 'Song Description (max 99 chars)' : 'Lyrics'}
          {templateData && creationMode === 'prompt' && (
            <span className="text-sm text-gray-400 ml-2">
              (Template suggestion provided)
            </span>
          )}
        </Label>
        <Textarea
          id="prompt-input"
          placeholder={creationMode === 'prompt' ? "e.g., a upbeat pop song about summer nights" : "Paste your full lyrics here..."}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[120px] bg-black/20 border-white/20 text-white placeholder-gray-500"
          maxLength={creationMode === 'prompt' ? 99 : undefined}
        />
        {creationMode === 'prompt' && (
          <p className="text-xs text-gray-400 text-right">{prompt.length}/99</p>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Switch id="instrumental" checked={instrumental} onCheckedChange={setInstrumental} className="data-[state=checked]:bg-purple-500" />
        <Label htmlFor="instrumental" className="text-gray-300">Generate instrumental only</Label>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={isGenerating || genresLoading || (!selectedGenreId && !templateData)}
        variant="glass"
        size="lg"
        className="w-full font-bold"
      >
        {isGenerating ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Music className="mr-2 h-4 w-4" />
        )}
        Generate Song (20 Credits)
      </Button>

      <p className="text-xs text-gray-400 text-center">
        Generation takes 1-2 minutes. Your song will appear in the Library.
      </p>
    </div>
  );
};
