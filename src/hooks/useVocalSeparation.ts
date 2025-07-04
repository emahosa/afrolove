
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VocalSeparationData {
  instrumental_url: string;
  origin_url: string;
  vocal_url: string;
}

interface VocalSeparationStatus {
  code: number;
  msg: string;
  data?: {
    task_id: string;
    status: 'PENDING' | 'SUCCESS' | 'CREATE_TASK_FAILED' | 'GENERATE_AUDIO_FAILED' | 'CALLBACK_EXCEPTION';
    vocal_removal_info?: VocalSeparationData;
    create_time?: string;
    finish_time?: string;
  };
}

export const useVocalSeparation = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const startVocalSeparation = async (taskId: string, audioId: string) => {
    setLoading(true);
    setStatus('Starting vocal separation...');
    
    try {
      const { data, error } = await supabase.functions.invoke('suno-vocal-removal', {
        body: { taskId, audioId }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.code === 200) {
        setStatus('Vocal separation initiated successfully');
        toast.success('Vocal separation started! This may take a few minutes.');
        return { success: true, data };
      } else {
        throw new Error(data.msg || 'Failed to start vocal separation');
      }
    } catch (error: any) {
      console.error('Error starting vocal separation:', error);
      setStatus('Failed to start vocal separation');
      toast.error(error.message || 'Failed to start vocal separation');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const checkVocalSeparationStatus = async (taskId: string): Promise<VocalSeparationStatus | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('suno-vocal-status', {
        body: { taskId }
      });

      if (error) {
        throw new Error(error.message);
      }

      return data as VocalSeparationStatus;
    } catch (error: any) {
      console.error('Error checking vocal separation status:', error);
      toast.error(error.message || 'Failed to check vocal separation status');
      return null;
    }
  };

  const downloadVocalSeparationFiles = async (
    instrumentalUrl: string, 
    vocalUrl: string, 
    originalUrl: string,
    songTitle: string = 'song'
  ) => {
    try {
      setLoading(true);
      setStatus('Preparing download...');

      // Create a zip file with all three tracks
      const files = [
        { url: originalUrl, name: `${songTitle}_original.mp3` },
        { url: instrumentalUrl, name: `${songTitle}_instrumental.mp3` },
        { url: vocalUrl, name: `${songTitle}_vocals.mp3` }
      ];

      // Download each file
      for (const file of files) {
        const response = await fetch(file.url);
        if (!response.ok) throw new Error(`Failed to download ${file.name}`);
        
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(downloadUrl);
      }

      setStatus('Download completed');
      toast.success('All vocal separation files downloaded successfully!');
    } catch (error: any) {
      console.error('Error downloading vocal separation files:', error);
      setStatus('Download failed');
      toast.error(error.message || 'Failed to download files');
    } finally {
      setLoading(false);
    }
  };

  return {
    startVocalSeparation,
    checkVocalSeparationStatus,
    downloadVocalSeparationFiles,
    loading,
    status
  };
};
