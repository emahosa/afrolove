import React from 'react';
import { Music } from 'lucide-react';

interface MusicLogoProps {
  size?: number; // size in px
  color?: string; // color of the note
}

const MusicLogo: React.FC<MusicLogoProps> = ({
  size = 128,
  color = '#9A3412', // default site primary color
}) => {
  return (
    <Music
      size={size}
      color={color}
    />
  );
};

export default MusicLogo;
