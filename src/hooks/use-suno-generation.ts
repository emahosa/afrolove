
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface SunoGenerationRequest {
  prompt: string;
  customMode: boolean;
  instrumental: boolean;
  title?: string;
  style?: string;
  model: 'V3_5' | 'V4' | 'V4_5';
}

export const getModelDisplayName = (apiModel: string): string => {
  switch (apiModel) {
    case 'V3_5': return 'Afro Model 1';
    case 'V4': return 'Afro Model 2'; 
    case 'V4_5': return 'Afro Model 3';
    default: return apiModel;
  }
};

export const getApiModelName = (displayName: string): string => {
  switch (displayName) {
    case 'Afro Model 1': return 'V3_5';
    case 'Afro Model 2': return 'V4';
    case 'Afro Model 3': return 'V4_5';
    default: return displayName;
  }
};

export const useSunoGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useAuth();

  const generateSong = async (request: SunoGenerationRequest): Promise<string | null> => {
    if (!user) {
      toast.error('Please log in to generate songs');
      return null;
    }

    if ((user.credits || 0) < 20) {
      toast.error('Insufficient credits. You need 20 credits to generate a song.');
      return null;
    }

    setIsGenerating(true);
    try {
      console.log('Starting song generation with request:', request);
      
      const { data, error } = await supabase.functions.invoke('suno-generate', {
        body: request
      });

      if (error) {
        console.error('Suno generation error:', error);
        
        // Handle specific error types
        if (error.message?.includes('insufficient credits')) {
          toast.error('Insufficient Suno API credits. Please contact admin.');
        } else if (error.message?.includes('rate limit')) {
          toast.error('Rate limit exceeded. Please try again in a few minutes.');
        } else if (error.message?.includes('network')) {
          toast.error('Network error. Please check your connection and try again.');
        } else {
          toast.error(`Generation failed: ${error.message}`);
        }
        return null;
      }

      if (data?.taskId) {
        toast.success('Song generation started! Check your library for the result.');
        return data.taskId;
      } else {
        toast.error('Failed to start generation. Please try again.');
        return null;
      }
    } catch (error) {
      console.error('Unexpected error during song generation:', error);
      toast.error('An unexpected error occurred. Please try again.');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateSong,
    isGenerating
  };
};
