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
  isAdminTest?: boolean; // Add this field
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

      if (error) {
        console.error('Suno generation error:', error);
        
        // Handle specific Suno API credit errors
        if (error.message?.includes('Suno API credits are insufficient')) {
          toast.error('⚠️ Suno API Credits Exhausted', {
            description: 'The Suno AI service has run out of credits. Please contact the administrator to top up the Suno account.',
            duration: 8000,
          });
        } else {
          toast.error('Generation failed: ' + (error.message || 'Unknown error'));
        }
        
        throw new Error(error.message || 'Failed to start song generation');
      }

      if (!data.success) {
        if (data.error?.includes('Suno API credits are insufficient')) {
          toast.error('⚠️ Suno API Credits Exhausted', {
            description: 'The Suno AI service has run out of credits. Please contact the administrator to top up the Suno account.',
            duration: 8000,
          });
        } else {
          toast.error('Generation failed: ' + (data.error || 'Unknown error'));
        }
        throw new Error(data.error || 'Generation failed');
      }

      const taskId = data.task_id;
      setCurrentTaskId(taskId);
      setGenerationStatus({
        task_id: taskId,
        status: 'PENDING'
      });

      console.log('Song generation started with task ID:', taskId);
      toast.success('Song generation started! This may take 1-2 minutes.');

      // Start polling for status updates
      startPolling(taskId);

      return taskId;
    } catch (error: any) {
      console.error('Error generating song:', error);
      // Don't show duplicate error toasts - they're already handled above
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const startPolling = (taskId: string) => {
    let pollCount = 0;
    const maxPolls = 30; // Poll for up to 5 minutes (10s intervals)

    const pollInterval = setInterval(async () => {
      pollCount++;
      
      try {
        console.log(`Polling status for task ${taskId}, attempt ${pollCount}`);
        
        const { data, error } = await supabase.functions.invoke('suno-status', {
          body: { taskId }
        });

        if (error) {
          console.error('Status polling error:', error);
          return;
        }

        if (data && data.data) {
          const status = data.data.status;
          console.log('Current status:', status);

          setGenerationStatus(prev => ({
            ...prev!,
            status,
            ...data.data
          }));

          if (status === 'SUCCESS') {
            clearInterval(pollInterval);
            setCurrentTaskId(null);
            toast.success('🎵 Your song is ready!');
            console.log('Generation completed successfully');
          } else if (status === 'FAIL') {
            clearInterval(pollInterval);
            setCurrentTaskId(null);
            toast.error('Song generation failed. Please try again.');
            console.error('Generation failed');
          } else if (status === 'TEXT_SUCCESS') {
            toast.info('Lyrics generated, creating audio...');
          } else if (status === 'FIRST_SUCCESS') {
            toast.info('First track ready, generating second track...');
          }
        }

        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          setCurrentTaskId(null);
          toast.warning('Generation is taking longer than expected. Check back later.');
          console.log('Polling timeout reached');
        }
      } catch (error) {
        console.error('Error during status polling:', error);
      }
    }, 10000); // Poll every 10 seconds
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
