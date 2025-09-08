import React from 'react';
import { Music } from 'lucide-react';

interface MusicLogoProps {
  size?: number;
  color?: string;
}

const MusicLogo: React.FC<MusicLogoProps> = ({
  size = 28,
  color = '#7b39ed', // Site primary color
}) => {
  return <Music size={size} color={color} />;
};

export default MusicLogo;
