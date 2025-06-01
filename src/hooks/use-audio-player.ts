
import { useCallback } from 'react';

interface PlayingRequest {
  id: string;
  title: string;
  type?: 'suno' | 'custom';
}

export const useAudioPlayer = () => {
  const handlePlay = useCallback((request: PlayingRequest) => {
    console.log('🔥 useAudioPlayer: handlePlay function called with:', request);
    console.log('🔥 useAudioPlayer: About to create custom event');
    
    // Trigger a custom event to communicate with the AppLayout
    const event = new CustomEvent('audioPlayerPlay', { 
      detail: request,
      bubbles: true 
    });
    console.log('🔥 useAudioPlayer: Custom event created:', event);
    console.log('🔥 useAudioPlayer: Event detail:', event.detail);
    
    console.log('🔥 useAudioPlayer: About to dispatch event to window');
    window.dispatchEvent(event);
    console.log('🔥 useAudioPlayer: Event dispatched to window successfully');
  }, []);

  console.log('🔥 useAudioPlayer: Hook initialized, returning handlePlay function');
  return { handlePlay };
};
