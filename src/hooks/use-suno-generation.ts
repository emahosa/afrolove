
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
  negativeTags?: string;
}

export interface SunoGenerationStatus {
  task_id: string;
  status: 'PENDING' | 'TEXT_SUCCESS' | 'FIRST_SUCCESS' | 'SUCCESS' | 'FAIL';
  audio_url?: string;
  stream_audio_url?: string;
  image_url?: string;
  title?: string;
  duration?: number;
  model_name?: string;
  prompt?: string;
}

export const useSunoGeneration = () => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  const generateSong = async (request: SunoGenerationRequest): Promise<string | null> => {
    if (!user) {
      toast.error('You must be logged in to generate songs');
      return null;
    }

    try {
      setIsGenerating(true);
      console.log('Starting song generation:', request);

      const { data, error } = await supabase.functions.invoke('suno-generate', {
        body: {
          ...request,
          userId: user.id
        }
      });

      if (error) {
        console.error('Generation error:', error);
        toast.error('Generation failed: ' + (error.message || 'Unknown error'));
        return null;
      }

      if (!data?.success) {
        const errorMsg = data?.error || 'Generation failed';
        toast.error(errorMsg);
        return null;
      }

      const taskId = data.task_id;
      if (!taskId) {
        toast.error('No task ID received');
        return null;
      }

      setCurrentTaskId(taskId);
      toast.success('🎵 Song generation started! Check your library for progress.');
      return taskId;

    } catch (error: any) {
      console.error('Error generating song:', error);
      toast.error('Generation failed: ' + error.message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const checkStatus = async (taskId: string): Promise<SunoGenerationStatus | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('suno-status', {
        body: { taskId }
      });

      if (error) {
        console.error('Status check error:', error);
        return null;
      }

      return data?.data || null;
    } catch (error) {
      console.error('Error checking status:', error);
      return null;
    }
  };

  const resetGeneration = () => {
    setIsGenerating(false);
    setCurrentTaskId(null);
  };

  return {
    generateSong,
    checkStatus,
    resetGeneration,
    isGenerating,
    currentTaskId
  };
};
