
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Music, Play, Pause } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface GenreTemplate {
  id: string;
  template_name: string;
  admin_prompt: string;
  user_prompt_guide?: string;
  genre_id: string;
  audio_url?: string;
  cover_image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface GenreTemplateCardProps {
  template: GenreTemplate;
  isPlaying: boolean;
  onTogglePlay: (templateId: string) => void;
}

const GenreTemplateCard: React.FC<GenreTemplateCardProps> = ({
  template,
  isPlaying,
  onTogglePlay
}) => {
  const navigate = useNavigate();

  const handleUseTemplate = () => {
    // Navigate to create page with template data
    navigate('/create', { 
      state: { 
        selectedTemplate: template,
        templatePrompt: template.admin_prompt // Pass the admin prompt
      } 
    });
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Music className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{template.template_name}</CardTitle>
          </div>
          <Badge variant="secondary">Template</Badge>
        </div>
        <CardDescription className="line-clamp-2">
          {template.user_prompt_guide || "AI-generated music template"}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {template.cover_image_url && (
          <div className="relative">
            <img 
              src={template.cover_image_url} 
              alt={template.template_name}
              className="w-full h-32 object-cover rounded-md"
            />
          </div>
        )}
        
        <div className="flex items-center justify-between">
          {template.audio_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTogglePlay(template.id)}
              className="flex items-center gap-2"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isPlaying ? 'Pause' : 'Preview'}
            </Button>
          )}
          
          <Button 
            onClick={handleUseTemplate}
            className="flex items-center gap-2"
          >
            <Music className="h-4 w-4" />
            Use Template
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default GenreTemplateCard;
