
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, Play } from "lucide-react";
import { useState } from "react";
import { useSunoGeneration } from "@/hooks/use-suno-generation";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface GenreTemplate {
  id: string;
  template_name: string;
  admin_prompt: string;
  user_prompt_guide?: string | null;
  audio_url?: string | null;
  cover_image_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  created_by?: string | null;
  genre_id: string;
  genres?: {
    name: string;
    description?: string | null;
  };
}

interface GenreTemplateCardProps {
  template: GenreTemplate;
}

export const GenreTemplateCard = ({ template }: GenreTemplateCardProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { generateSong } = useSunoGeneration();
  const { user, updateUserCredits } = useAuth();

  const handleGenerate = async () => {
    if (!user) {
      toast.error("Please log in to generate songs");
      return;
    }

    if ((user.credits || 0) < 20) {
      toast.error("You need at least 20 credits to generate a song");
      return;
    }

    setIsGenerating(true);
    
    try {
      // Use the template's admin_prompt instead of genre prompt_template
      const result = await generateSong({
        prompt: template.admin_prompt, // This is the key fix
        title: `${template.template_name} Song`,
        instrumental: false,
        customMode: false,
        model: 'V3_5'
      });
      
      if (result) {
        updateUserCredits(-20);
        toast.success(`Song generation started using ${template.template_name} template!`);
      }
    } catch (error) {
      console.error('Generation failed:', error);
      toast.error("Failed to start song generation. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        {template.cover_image_url ? (
          <img
            src={template.cover_image_url}
            alt={template.template_name}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <Music className="h-16 w-16 text-primary/50" />
          </div>
        )}
        
        {template.audio_url && (
          <Button
            size="sm"
            variant="secondary"
            className="absolute top-4 right-4"
            onClick={() => {
              const audio = new Audio(template.audio_url!);
              audio.play().catch(console.error);
            }}
          >
            <Play className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <CardHeader>
        <CardTitle className="text-lg">{template.template_name}</CardTitle>
        {template.genres && (
          <CardDescription>
            Genre: {template.genres.name}
            {template.genres.description && ` - ${template.genres.description}`}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {template.user_prompt_guide && (
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">Style Guide:</p>
            <p>{template.user_prompt_guide}</p>
          </div>
        )}
        
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !user || (user.credits || 0) < 20}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
              Generating...
            </>
          ) : (
            <>
              <Music className="mr-2 h-4 w-4" />
              Generate Song (20 Credits)
            </>
          )}
        </Button>
        
        {user && (user.credits || 0) < 20 && (
          <p className="text-sm text-destructive text-center">
            Not enough credits. You need 20 credits to generate a song.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
