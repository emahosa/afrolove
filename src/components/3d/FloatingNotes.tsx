
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

interface NoteProps {
  position: [number, number, number];
  scale: number;
  color: string;
}

const Note: React.FC<NoteProps> = ({ position, scale, color }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01;
      meshRef.current.rotation.y += 0.01;
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime + position[0]) * 0.002;
    }
  });

  return (
    <Sphere ref={meshRef} position={position} scale={scale}>
      <meshStandardMaterial color={color} transparent opacity={0.6} />
    </Sphere>
  );
};

const FloatingNotes: React.FC = () => {
  const notes = useMemo(() => {
    const noteArray = [];
    for (let i = 0; i < 20; i++) {
      noteArray.push({
        position: [
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
        ] as [number, number, number],
        scale: Math.random() * 0.5 + 0.2,
        color: `hsl(${280 + Math.random() * 40}, 70%, ${50 + Math.random() * 30}%)`,
      });
    }
    return noteArray;
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 75 }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
      }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      {notes.map((note, index) => (
        <Note
          key={index}
          position={note.position}
          scale={note.scale}
          color={note.color}
        />
      ))}
    </Canvas>
  );
};

export { FloatingNotes };
