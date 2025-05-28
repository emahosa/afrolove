
import { useCallback } from 'react';

interface PlayingRequest {
  id: string;
  title: string;
}

export const useAudioPlayer = () => {
  const handlePlay = useCallback((request: PlayingRequest) => {
    // Find the audio player context from the DOM
    const contextElement = document.querySelector('[data-audio-player-context]');
    if (contextElement) {
      const contextData = JSON.parse(contextElement.getAttribute('data-audio-player-context') || '{}');
      if (contextData.handlePlay) {
        // Trigger a custom event to communicate with the AppLayout
        const event = new CustomEvent('audioPlayerPlay', { detail: request });
        window.dispatchEvent(event);
      }
    }
  }, []);

  return { handlePlay };
};
