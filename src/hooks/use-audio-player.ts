
import { useCallback } from 'react';

interface PlayingRequest {
  id: string;
  title: string;
  type?: 'suno' | 'custom';
}

export const useAudioPlayer = () => {
  const handlePlay = useCallback((request: PlayingRequest) => {
    console.log('useAudioPlayer: Triggering play for:', request);
    
    // Trigger a custom event to communicate with the AppLayout
    const event = new CustomEvent('audioPlayerPlay', { 
      detail: request,
      bubbles: true 
    });
    console.log('useAudioPlayer: Dispatching event with detail:', request);
    
    window.dispatchEvent(event);
    console.log('useAudioPlayer: Event dispatched successfully');
  }, []);

  return { handlePlay };
};
