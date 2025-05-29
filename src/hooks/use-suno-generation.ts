
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface SunoGenerationRequest {
  prompt: string;
  style: string;
  title?: string;
  instrumental: boolean;
  customMode: boolean;
  model: 'V3_5' | 'V4' | 'V4_5';
  negativeTags?: string;
  requestId?: string;
  isAdminTest?: boolean;
}

export interface SunoGenerationStatus {
  task_id: string;
  status: 'PENDING' | 'TEXT_SUCCESS' | 'FIRST_SUCCESS' | 'SUCCESS' | 'FAIL';
  audio_url?: string;
  stream_audio_url?: string;
  image_url?: string;
  title?: string;
  duration?: number;
}

export const useSunoGeneration = () => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<SunoGenerationStatus | null>(null);

  const generateSong = async (request: SunoGenerationRequest): Promise<string | null> => {
    if (!user) {
      toast.error('You must be logged in to generate songs');
      return null;
    }

    try {
      setIsGenerating(true);
      console.log('Starting Suno generation:', request);

      const { data, error } = await supabase.functions.invoke('suno-generate', {
        body: {
          ...request,
          userId: user.id
        }
      });

      console.log('Suno generation response:', { data, error });

      if (error) {
        console.error('Suno generation error:', error);
        
        if (error.message?.includes('Suno API credits are insufficient')) {
          toast.error('⚠️ Suno API Credits Exhausted', {
            description: 'The Suno AI service has run out of credits. Please contact the administrator to top up the Suno account.',
            duration: 8000,
          });
        } else if (error.message?.includes('Insufficient credits')) {
          toast.error('Insufficient Credits', {
            description: 'You need at least 5 credits to generate a song. Please purchase more credits.',
            duration: 5000,
          });
        } else {
          toast.error('Generation failed: ' + (error.message || 'Unknown error'));
        }
        
        throw new Error(error.message || 'Failed to start song generation');
      }

      if (!data?.success) {
        const errorMsg = data?.error || 'Generation failed';
        
        if (errorMsg.includes('Suno API credits are insufficient')) {
          toast.error('⚠️ Suno API Credits Exhausted', {
            description: 'The Suno AI service has run out of credits. Please contact the administrator to top up the Suno account.',
            duration: 8000,
          });
        } else if (errorMsg.includes('Insufficient credits')) {
          toast.error('Insufficient Credits', {
            description: 'You need at least 5 credits to generate a song. Please purchase more credits.',
            duration: 5000,
          });
        } else {
          toast.error('Generation failed: ' + errorMsg);
        }
        
        throw new Error(errorMsg);
      }

      const taskId = data.task_id;
      if (!taskId) {
        toast.error('No task ID received from generation service');
        throw new Error('No task ID received');
      }

      setCurrentTaskId(taskId);
      setGenerationStatus({
        task_id: taskId,
        status: 'PENDING'
      });

      console.log('Song generation started with task ID:', taskId);
      toast.success('🎵 Song generation started! This may take 1-2 minutes.', {
        description: 'You can check your library to see the progress.',
        duration: 5000,
      });

      return taskId;
    } catch (error: any) {
      console.error('Error generating song:', error);
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
    setGenerationStatus(null);
  };

  return {
    generateSong,
    checkStatus,
    resetGeneration,
    isGenerating,
    currentTaskId,
    generationStatus
  };
};
