
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useSongStatusChecker = () => {
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(false);

  const checkSongStatus = useCallback(async (taskId: string) => {
    try {
      console.log('Checking status for task:', taskId);

      const { data, error } = await supabase.functions.invoke('suno-status', {
        body: { taskId }
      });

      if (error) {
        console.error('Status check error:', error);
        return false;
      }

      console.log('Status check response:', data);
      
      // Check if the song was updated in the database
      if (data?.success && data?.data?.data) {
        const statusData = data.data.data;
        if (Array.isArray(statusData) && statusData.length > 0) {
          const item = statusData[0];
          if (item.status === 'SUCCESS' && item.audio_url) {
            console.log('Song completed successfully:', item);
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('Status check failed:', error);
      return false;
    }
  }, []);

  const checkAllPendingSongs = useCallback(async () => {
    if (!user?.id || isChecking) return;

    try {
      setIsChecking(true);
      console.log('Checking all pending songs for user:', user.id);

      // Get all pending songs that have task IDs
      const { data: pendingSongs, error } = await supabase
        .from('songs')
        .select('id, title, audio_url, status')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .not('audio_url', 'eq', 'generating');

      if (error) {
        console.error('Error fetching pending songs:', error);
        return;
      }

      if (!pendingSongs || pendingSongs.length === 0) {
        console.log('No pending songs with task IDs found');
        return;
      }

      console.log('Found pending songs to check:', pendingSongs);

      // Check status for each pending song
      let updatedCount = 0;
      for (const song of pendingSongs) {
        if (song.audio_url && song.audio_url !== 'generating') {
          console.log(`Checking song ${song.id} with task ID: ${song.audio_url}`);
          const wasUpdated = await checkSongStatus(song.audio_url);
          if (wasUpdated) {
            updatedCount++;
          }
          // Small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (updatedCount > 0) {
        toast.success(`${updatedCount} song(s) completed and updated!`);
        // Trigger a page refresh to show updated songs
        window.location.reload();
      } else {
        console.log('No songs were updated');
      }

    } catch (error) {
      console.error('Error checking pending songs:', error);
      toast.error('Failed to check song status');
    } finally {
      setIsChecking(false);
    }
  }, [user?.id, isChecking, checkSongStatus]);

  // Auto-check every 30 seconds if there are pending songs
  useEffect(() => {
    if (!user?.id) return;

    // Check immediately on mount
    checkAllPendingSongs();

    const interval = setInterval(checkAllPendingSongs, 30000);

    return () => clearInterval(interval);
  }, [user?.id, checkAllPendingSongs]);

  return {
    checkAllPendingSongs,
    checkSongStatus,
    isChecking
  };
};
