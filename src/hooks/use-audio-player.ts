
import { useCallback } from 'react';

interface PlayingRequest {
  id: string;
  title: string;
  type?: 'suno' | 'custom'; // Add type to distinguish between song types
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
