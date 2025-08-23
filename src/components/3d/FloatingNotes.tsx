
import { useEffect, useRef } from 'react';

interface Note {
  id: number;
  x: number;
  y: number;
  z: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  velocityX: number;
  velocityY: number;
  velocityZ: number;
  scale: number;
  type: 'quarter' | 'eighth' | 'half' | 'whole';
}

export const FloatingNotes = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const notesRef = useRef<Note[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize notes
    const initializeNotes = () => {
      const noteCount = 15;
      notesRef.current = [];

      for (let i = 0; i < noteCount; i++) {
        notesRef.current.push({
          id: i,
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          z: Math.random() * 500 + 100,
          rotationX: Math.random() * Math.PI * 2,
          rotationY: Math.random() * Math.PI * 2,
          rotationZ: Math.random() * Math.PI * 2,
          velocityX: (Math.random() - 0.5) * 2,
          velocityY: (Math.random() - 0.5) * 2,
          velocityZ: (Math.random() - 0.5) * 1,
          scale: Math.random() * 0.5 + 0.5,
          type: ['quarter', 'eighth', 'half', 'whole'][Math.floor(Math.random() * 4)] as Note['type']
        });
      }
    };

    const drawNote = (note: Note) => {
      ctx.save();
      
      // Apply 3D-like perspective scaling
      const perspective = 1000;
      const scale = perspective / (perspective + note.z) * note.scale;
      
      ctx.translate(note.x, note.y);
      ctx.scale(scale, scale);
      ctx.rotate(note.rotationZ);
      
      // Set note color with opacity based on z-depth
      const opacity = Math.max(0.3, 1 - note.z / 600);
      ctx.fillStyle = `hsla(262, 83%, 58%, ${opacity})`;
      ctx.strokeStyle = `hsla(262, 83%, 58%, ${opacity * 1.2})`;
      ctx.lineWidth = 2;

      // Draw different note types
      switch (note.type) {
        case 'quarter':
          drawQuarterNote(ctx);
          break;
        case 'eighth':
          drawEighthNote(ctx);
          break;
        case 'half':
          drawHalfNote(ctx);
          break;
        case 'whole':
          drawWholeNote(ctx);
          break;
      }
      
      ctx.restore();
    };

    const drawQuarterNote = (ctx: CanvasRenderingContext2D) => {
      // Note head (filled oval)
      ctx.beginPath();
      ctx.save();
      ctx.scale(1, 0.7);
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.restore();
      ctx.fill();
      
      // Stem
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(13, -60);
      ctx.stroke();
    };

    const drawEighthNote = (ctx: CanvasRenderingContext2D) => {
      drawQuarterNote(ctx);
      
      // Flag
      ctx.beginPath();
      ctx.moveTo(13, -60);
      ctx.quadraticCurveTo(30, -50, 25, -30);
      ctx.quadraticCurveTo(20, -45, 13, -45);
      ctx.fill();
    };

    const drawHalfNote = (ctx: CanvasRenderingContext2D) => {
      // Note head (hollow oval)
      ctx.beginPath();
      ctx.save();
      ctx.scale(1, 0.7);
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.restore();
      ctx.stroke();
      
      // Stem
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(13, -60);
      ctx.stroke();
    };

    const drawWholeNote = (ctx: CanvasRenderingContext2D) => {
      // Whole note (hollow oval, no stem)
      ctx.beginPath();
      ctx.save();
      ctx.scale(1.2, 0.8);
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.restore();
      ctx.stroke();
    };

    const updateNotes = () => {
      notesRef.current.forEach(note => {
        // Update positions
        note.x += note.velocityX;
        note.y += note.velocityY;
        note.z += note.velocityZ;
        
        // Update rotations
        note.rotationX += 0.01;
        note.rotationY += 0.015;
        note.rotationZ += 0.008;
        
        // Wrap around screen edges
        if (note.x > canvas.width + 50) note.x = -50;
        if (note.x < -50) note.x = canvas.width + 50;
        if (note.y > canvas.height + 50) note.y = -50;
        if (note.y < -50) note.y = canvas.height + 50;
        
        // Wrap z-depth
        if (note.z > 600) note.z = -100;
        if (note.z < -100) note.z = 600;
      });
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      updateNotes();
      
      // Sort notes by z-depth for proper layering
      const sortedNotes = [...notesRef.current].sort((a, b) => b.z - a.z);
      sortedNotes.forEach(drawNote);
      
      animationRef.current = requestAnimationFrame(animate);
    };

    initializeNotes();
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        background: 'transparent'
      }}
    />
  );
};
