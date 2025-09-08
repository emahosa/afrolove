import React from 'react';

interface MusicLogoProps {
  size?: number; // size in px
  color?: string; // color of the note and circle
}

const MusicLogo: React.FC<MusicLogoProps> = ({
  size = 128,
  color = '#7b39ed', // default site primary color
}) => {
  const strokeWidth = size * 0.05;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer Circle */}
      <circle
        cx="50"
        cy="50"
        r="48"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      {/* Inner Circle */}
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth / 2}
      />
      {/* Music Note */}
      <path
        d="M60 30 V60
           A10 10 0 1 1 55 70
           V45
           A5 5 0 0 0 60 40
           Z"
        fill={color}
      />
    </svg>
  );
};

export default MusicLogo;
