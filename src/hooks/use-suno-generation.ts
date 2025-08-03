
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface SunoGenerationRequest {
  prompt: string;
  style?: string;
  title?: string;
  instrumental: boolean;
  customMode: boolean;
  model: 'V3_5' | 'V4' | 'V4_5';
}

// Model mapping for display purposes
export const getModelDisplayName = (model: string): string => {
  const modelMap: Record<string, string> = {
    'V3_5': 'Afro Model 1',
    'V4': 'Afro Model 2', 
    'V4_5': 'Afro Model 3'
  };
  return modelMap[model] || model;
};

// Reverse mapping for API calls
export const getApiModelName = (displayName: string): string => {
  const reverseMap: Record<string, string> = {
    'Afro Model 1': 'V3_5',
    'Afro Model 2': 'V4',
    'Afro Model 3': 'V4_5'
  };
  return reverseMap[displayName] || displayName;
};

export const useSunoGeneration = () => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSong = async (request: SunoGenerationRequest): Promise<string | null> => {
    if (!user) {
      toast.error('You must be logged in to generate songs');
      return null;
    }

    setIsGenerating(true);
    try {
      console.log('useSunoGeneration: Starting song generation with request:', request);

      const { data, error } = await supabase.functions.invoke('suno-generate', {
        body: {
          ...request,
          userId: user.id
        }
      });
      
      if (error || !data?.success) {
        const errorMessage = data?.error || error?.message || 'An unknown error occurred during generation.';
        console.error('Generation error:', errorMessage);
        toast.error(`Generation failed: ${errorMessage}`);
        return null;
      }

      const taskId = data.task_id;
      toast.success('🎵 Your song is being generated! It will appear in your library shortly. 20 credits deducted.');
      console.log('useSunoGeneration: Successfully started generation with task ID:', taskId);
      return taskId;

    } catch (error: any) {
      console.error('Critical error calling generateSong function:', error);
      toast.error('Generation failed: ' + error.message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const generateLyrics = async (prompt: string): Promise<string | null> => {
    if (!user) {
      toast.error('You must be logged in to generate lyrics');
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('suno-lyrics', {
        body: { prompt }
      });

      if (error) {
        console.error('Lyrics generation error:', error);
        return null;
      }

      return data?.lyrics || null;
    } catch (error) {
      console.error('Error generating lyrics:', error);
      return null;
    }
  };

  return {
    generateSong,
    generateLyrics,
    isGenerating,
  };
};
