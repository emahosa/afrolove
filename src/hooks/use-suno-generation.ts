
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
  model_name?: string;
  prompt?: string;
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

    // Check user credits first
    if (user.credits < 5) {
      toast.error('Insufficient credits. You need at least 5 credits to generate a song.');
      return null;
    }

    try {
      setIsGenerating(true);
      console.log('🎵 Starting song generation:', request);

      const { data, error } = await supabase.functions.invoke('suno-generate', {
        body: {
          ...request,
          userId: user.id
        }
      });

      console.log('📤 Generation function response:', { data, error });

      if (error) {
        console.error('❌ Generation error:', error);
        toast.error('Generation failed: ' + (error.message || 'Unknown error'));
        return null;
      }

      if (!data?.success) {
        const errorMsg = data?.error || 'Generation failed';
        console.error('❌ Generation failed:', errorMsg);
        toast.error(errorMsg);
        return null;
      }

      const taskId = data.task_id;
      if (!taskId) {
        console.error('❌ No task ID received');
        toast.error('No task ID received');
        return null;
      }

      setCurrentTaskId(taskId);
      console.log('✅ Generation started with task ID:', taskId);
      toast.success('🎵 Song generation started! Your song will appear in your library shortly.');
      return taskId;

    } catch (error: any) {
      console.error('💥 Error generating song:', error);
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
      console.log('📝 Generating lyrics for prompt:', prompt.substring(0, 50) + '...');
      
      const { data, error } = await supabase.functions.invoke('suno-lyrics', {
        body: { prompt }
      });

      if (error) {
        console.error('❌ Lyrics generation error:', error);
        toast.error('Failed to generate lyrics: ' + error.message);
        return null;
      }

      console.log('✅ Lyrics generated successfully');
      return data?.lyrics || null;
    } catch (error: any) {
      console.error('💥 Error generating lyrics:', error);
      toast.error('Failed to generate lyrics: ' + error.message);
      return null;
    }
  };

  const checkStatus = async (taskId: string): Promise<SunoGenerationStatus | null> => {
    try {
      console.log('🔍 Checking status for task:', taskId);
      
      const { data, error } = await supabase.functions.invoke('suno-status', {
        body: { taskId }
      });

      if (error) {
        console.error('❌ Status check error:', error);
        return null;
      }

      const status = data?.data || null;
      setGenerationStatus(status);
      console.log('📊 Status check result:', status);
      return status;
    } catch (error: any) {
      console.error('💥 Error checking status:', error);
      return null;
    }
  };

  const resetGeneration = () => {
    setIsGenerating(false);
    setCurrentTaskId(null);
    setGenerationStatus(null);
    console.log('🔄 Generation state reset');
  };

  return {
    generateSong,
    generateLyrics,
    checkStatus,
    resetGeneration,
    isGenerating,
    currentTaskId,
    generationStatus
  };
};
