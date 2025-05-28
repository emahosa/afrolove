
import { useCallback } from 'react';

interface PlayingRequest {
  id: string;
  title: string;
}

export const useAudioPlayer = () => {
  const handlePlay = useCallback((request: PlayingRequest) => {
    console.log('useAudioPlayer: Triggering play for:', request);
    // Trigger a custom event to communicate with the AppLayout
    const event = new CustomEvent('audioPlayerPlay', { detail: request });
    window.dispatchEvent(event);
  }, []);

  return { handlePlay };
};
