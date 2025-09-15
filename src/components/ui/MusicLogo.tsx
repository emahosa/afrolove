import React from 'react';
import { Music } from 'lucide-react';

interface MusicLogoProps {
  size?: number; // size of the logo in px
  className?: string;
}

const MusicLogo: React.FC<MusicLogoProps> = ({
  size = 128,
  className,
}) => {
  const outerSize = size;
  const iconSize = size * 0.5; // Make the icon smaller than the circle

  return (
    <div
      className={`bg-[#4c1d95] rounded-full flex items-center justify-center ${className}`}
      style={{
        width: outerSize,
        height: outerSize,
      }}
    >
      <Music
        size={iconSize}
        color="white"
      />
    </div>
  );
};

export default MusicLogo;
