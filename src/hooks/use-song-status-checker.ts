
import { useState, useCallback } from 'react';
import { toast } from 'sonner';

// NOTE: This hook has been simplified to remove polling logic.
// Song status updates are now handled primarily by real-time subscriptions
// in components like Library.tsx.

export const useSongStatusChecker = () => {
  const [isChecking, setIsChecking] = useState(false);

  // The polling functionality has been removed to prevent infinite loops
  // and reliance on potentially deleted edge functions.
  // These functions are kept as stubs to avoid breaking components that use them.
  const checkSongStatus = useCallback(async (taskId: string) => {
    console.warn('Manual song status check is deprecated.');
    toast.info("Checking status manually is no longer needed. Updates are realtime!");
    return false;
  }, []);

  const checkAllPendingSongs = useCallback(async () => {
    console.warn('Manual check for all pending songs is deprecated.');
  }, []);

  return {
    checkAllPendingSongs,
    checkSongStatus,
    isChecking
  };
};
