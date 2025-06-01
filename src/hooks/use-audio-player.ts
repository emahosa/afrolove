
import { useCallback } from 'react';

interface PlayingRequest {
  id: string;
  title: string;
  type?: 'suno' | 'custom'; // Add type to distinguish between song types
}

export const useAudioPlayer = () => {
  const handlePlay = useCallback((request: PlayingRequest) => {
    console.log('useAudioPlayer: Triggering play for:', request);
    console.log('useAudioPlayer: Creating custom event with detail:', request);
    
    // Trigger a custom event to communicate with the AppLayout
    const event = new CustomEvent('audioPlayerPlay', { detail: request });
    console.log('useAudioPlayer: Dispatching event:', event);
    
    window.dispatchEvent(event);
    console.log('useAudioPlayer: Event dispatched successfully');
  }, []);

  return { handlePlay };
};
