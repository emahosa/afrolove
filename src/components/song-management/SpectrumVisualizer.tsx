
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BarChart3, BarChart3Icon } from 'lucide-react';

interface SpectrumVisualizerProps {
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
  width?: number;
  height?: number;
  barCount?: number;
  showToggle?: boolean;
}

export const SpectrumVisualizer = ({
  audioElement,
  isPlaying,
  width = 400,
  height = 80,
  barCount = 64,
  showToggle = true
}: SpectrumVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    if (!audioElement || !isEnabled) {
      cleanup();
      return;
    }

    const setupAudioContext = async () => {
      try {
        // Create audio context if it doesn't exist
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        const audioContext = audioContextRef.current;

        // Resume context if suspended
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        // Create analyser if it doesn't exist
        if (!analyserRef.current) {
          analyserRef.current = audioContext.createAnalyser();
          analyserRef.current.fftSize = 256;
          analyserRef.current.smoothingTimeConstant = 0.8;
        }

        // Create source if it doesn't exist
        if (!sourceRef.current && audioElement) {
          try {
            sourceRef.current = audioContext.createMediaElementSource(audioElement);
            sourceRef.current.connect(analyserRef.current);
            analyserRef.current.connect(audioContext.destination);
          } catch (error) {
            // Source might already be created, ignore this error
            console.log('Audio source already exists or couldn\'t be created');
          }
        }
      } catch (error) {
        console.error('Error setting up audio context:', error);
      }
    };

    setupAudioContext();
  }, [audioElement, isEnabled]);

  useEffect(() => {
    if (isPlaying && isEnabled && analyserRef.current) {
      startVisualization();
    } else {
      stopVisualization();
    }

    return () => stopVisualization();
  }, [isPlaying, isEnabled]);

  const startVisualization = () => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isPlaying || !isEnabled) return;

      analyser.getByteFrequencyData(dataArray);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate bar width
      const barWidth = canvas.width / barCount;
      const step = Math.floor(bufferLength / barCount);

      for (let i = 0; i < barCount; i++) {
        // Get average amplitude for this frequency range
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += dataArray[i * step + j];
        }
        const amplitude = sum / step;

        // Calculate bar height (with minimum height for visual appeal)
        const barHeight = Math.max(2, (amplitude / 255) * canvas.height * 0.9);
        
        // Calculate position
        const x = i * barWidth;
        const y = canvas.height - barHeight;

        // Create rainbow gradient based on frequency
        const hue = (i / barCount) * 270; // 0 to 270 degrees (violet to red)
        const saturation = 80 + (amplitude / 255) * 20; // 80% to 100%
        const lightness = 50 + (amplitude / 255) * 30; // 50% to 80%
        
        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        
        // Add glow effect
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 2;
        
        // Draw rounded rectangle
        ctx.beginPath();
        ctx.roundRect(x + 1, y, barWidth - 2, barHeight, 2);
        ctx.fill();
        
        // Reset shadow
        ctx.shadowBlur = 0;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  const stopVisualization = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
  };

  const cleanup = () => {
    stopVisualization();
    
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch (error) {
        console.log('Source already disconnected');
      }
      sourceRef.current = null;
    }
    
    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch (error) {
        console.log('Analyser already disconnected');
      }
      analyserRef.current = null;
    }
    
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (error) {
        console.log('Audio context already closed');
      }
      audioContextRef.current = null;
    }
  };

  useEffect(() => {
    return cleanup;
  }, []);

  const toggleVisualizer = () => {
    setIsEnabled(!isEnabled);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {showToggle && (
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleVisualizer}
          className="h-6 px-2 text-xs"
        >
          <BarChart3 className="h-3 w-3 mr-1" />
          {isEnabled ? 'Hide' : 'Show'} Spectrum
        </Button>
      )}
      
      {isEnabled && (
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="rounded-md bg-black/20 border border-melody-primary/20"
          style={{ width: `${width}px`, height: `${height}px` }}
        />
      )}
    </div>
  );
};
