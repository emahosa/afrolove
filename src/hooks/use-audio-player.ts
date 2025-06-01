
import { useCallback } from 'react';

interface PlayingRequest {
  id: string;
  title: string;
  type?: 'suno' | 'custom';
}

export const useAudioPlayer = () => {
  const handlePlay = useCallback((request: PlayingRequest) => {
    console.log('🔥 useAudioPlayer: handlePlay called with:', request);
    
    // Create and dispatch the custom event to AppLayout
    const event = new CustomEvent('audioPlayerPlay', { 
      detail: request,
      bubbles: true 
    });
    
    console.log('🔥 useAudioPlayer: Dispatching event to trigger bottom audio player');
    window.dispatchEvent(event);
    
  }, []);

  return { handlePlay };
};
