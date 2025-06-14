/// <reference types="vite/client" />

// Add custom property to the Window interface for debugging
interface Window {
  __TEST_AUDIO_PROVIDER?: boolean;
}
