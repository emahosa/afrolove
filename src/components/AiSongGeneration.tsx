
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Music, Sparkles, Settings } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useSunoGeneration, getModelDisplayName, getApiModelName } from "@/hooks/use-suno-generation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TemplateData {
  selectedTemplate: any;
  templatePrompt: string;
}

interface AiSongGenerationProps {
  templateData?: TemplateData | null;
}

const AiSongGeneration: React.FC<AiSongGenerationProps> = ({ templateData }) => {
  const { user } = useAuth();
  const { generateSong, isGenerating } = useSunoGeneration();
  
  const [formData, setFormData] = useState({
    prompt: "",
    title: "",
    style: "",
    instrumental: false,
    customMode: false,
    model: "V3_5" as const
  });

  useEffect(() => {
    if (templateData?.selectedTemplate) {
      setFormData(prev => ({
        ...prev,
        style: templateData.selectedTemplate.template_name,
        // Don't set the prompt here, let user add their own
      }));
    }
  }, [templateData]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    if (!formData.prompt.trim()) {
      toast.error("Please describe what kind of song you want to create");
      return;
    }

    if (!user) {
      toast.error("Please log in to generate songs");
      return;
    }

    if ((user.credits || 0) < 20) {
      toast.error("You need 20 credits to generate a song");
      return;
    }

    const requestData = {
      prompt: formData.prompt,
      title: formData.title,
      style: formData.style,
      instrumental: formData.instrumental,
      customMode: formData.customMode,
      model: formData.model,
      // Include template prompt if available
      templatePrompt: templateData?.templatePrompt || undefined
    };

    console.log('Generating song with data:', requestData);

    try {
      const taskId = await generateSong(requestData);
      if (taskId) {
        toast.success("Song generation started! Check your library for updates.");
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Failed to generate song. Please try again.");
    }
  };

  const availableModels = ["V3_5", "V4", "V4_5"];

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create AI Song</h1>
        <p className="text-muted-foreground mt-2">
          Generate unique songs using artificial intelligence. Each generation costs 20 credits.
        </p>
        {templateData?.selectedTemplate && (
          <div className="mt-4 p-3 bg-primary/10 rounded-lg">
            <p className="text-sm font-medium text-primary">
              Using template: {templateData.selectedTemplate.template_name}
            </p>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Song Details
          </CardTitle>
          <CardDescription>
            Describe your song and customize generation settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="prompt">Song Description *</Label>
            <Textarea
              id="prompt"
              placeholder={templateData?.selectedTemplate 
                ? `Describe your song using the ${templateData.selectedTemplate.template_name} template...`
                : "Describe the song you want to create (e.g., 'A happy pop song about summer')"
              }
              value={formData.prompt}
              onChange={(e) => handleInputChange("prompt", e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Song Title (Optional)</Label>
              <Input
                id="title"
                placeholder="Enter song title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="style">Music Style (Optional)</Label>
              <Input
                id="style"
                placeholder={templateData?.selectedTemplate ? templateData.selectedTemplate.template_name : "e.g., pop, rock, jazz"}
                value={formData.style}
                onChange={(e) => handleInputChange("style", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label>Generation Options</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="instrumental"
                  checked={formData.instrumental}
                  onCheckedChange={(checked) => handleInputChange("instrumental", checked)}
                />
                <Label htmlFor="instrumental" className="text-sm">
                  Generate instrumental version (no vocals)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="customMode"
                  checked={formData.customMode}
                  onCheckedChange={(checked) => handleInputChange("customMode", checked)}
                />
                <Label htmlFor="customMode" className="text-sm">
                  Use custom lyrics mode
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>AI Model</Label>
            <Select
              value={formData.model}
              onValueChange={(value) => handleInputChange("model", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select AI model" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model} value={model}>
                    {getModelDisplayName(model)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-medium">Generation Cost</p>
                <p className="text-sm text-muted-foreground">20 credits per song</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Your Credits</p>
                <p className="font-bold text-lg">{user?.credits || 0}</p>
              </div>
            </div>
            
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !formData.prompt.trim() || (user?.credits || 0) < 20}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Song...
                </>
              ) : (
                <>
                  <Music className="mr-2 h-4 w-4" />
                  Generate Song (20 Credits)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AiSongGeneration;
