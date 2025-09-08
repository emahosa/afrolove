
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
    <div className="space-y-8">
      {/* Mode Tabs */}
      <div className="flex justify-center">
        <div className="flex bg-muted rounded-lg p-1">
          <button
            onClick={() => setCreationMode('prompt')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              creationMode === 'prompt' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Simple
          </button>
          <button
            onClick={() => setCreationMode('lyrics')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              creationMode === 'lyrics' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Custom
          </button>
        </div>
      </div>

      {/* Template Info */}
      {templateData && (
        <div className="text-center">
          <h3 className="text-lg font-bold">Using Template: {templateData.template_name}</h3>
          <p className="text-muted-foreground">
            Genre: {templateData.genres?.name}
          </p>
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Describe your song</h2>
          
          <div className="space-y-4">
            {/* Song Description/Lyrics Input */}
            <Textarea
              id="prompt-input"
              placeholder={creationMode === 'prompt' ? "e.g., A vibrant Afrobeat track celebrating the joy of life" : "Paste your full lyrics here..."}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px] bg-background border-border text-foreground placeholder-muted-foreground resize-none"
              maxLength={creationMode === 'prompt' ? 99 : undefined}
            />
            {creationMode === 'prompt' && (
              <p className="text-xs text-muted-foreground text-right">{prompt.length}/99</p>
            )}
          </div>

          {/* Additional Options Row */}
          <div className="flex gap-4 mt-4">
            <button className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg text-sm hover:bg-muted/80 transition-colors">
              + Audio
            </button>
            <button 
              onClick={() => setCreationMode('lyrics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                creationMode === 'lyrics' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
              }`}
            >
              + Lyrics
            </button>
            <button 
              onClick={() => setInstrumental(!instrumental)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                instrumental ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
              }`}
            >
              + Instrumental
            </button>
          </div>

          {/* Custom Mode Fields */}
          {creationMode === 'lyrics' && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="title" className="text-sm font-medium">Song Title *</Label>
                <Input 
                  id="title" 
                  placeholder="e.g., Midnight Rain" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="model" className="text-sm font-medium">AI Model</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger id="model" className="mt-1">
                    <SelectValue placeholder="Select an AI model" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map(model => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Genre Selection for non-template mode */}
          {!templateData && (
            <div className="mt-4">
              <Label htmlFor="genre" className="text-sm font-medium">Genre *</Label>
              {genresLoading ? (
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                  Loading genres...
                </div>
              ) : (
                <Select value={selectedGenreId} onValueChange={setSelectedGenreId} disabled={genresLoading}>
                  <SelectTrigger id="genre" className="mt-1">
                    <SelectValue placeholder="Select a genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {genres.map(genre => (
                      <SelectItem key={genre.id} value={genre.id}>
                        {genre.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>

        {/* Inspiration Section */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Inspiration</h3>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm">
              Afro
            </span>
            <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm border border-border">
              Chill
            </span>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || genresLoading || (!selectedGenreId && !templateData)}
          className="w-full bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-bold text-lg py-6"
          size="lg"
        >
          {isGenerating ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Music className="mr-2 h-5 w-5" />
          )}
          Create (20 Credits)
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Generation takes 1-2 minutes. Your song will appear in the Library.
        </p>
      </div>
    </div>
  );
};
