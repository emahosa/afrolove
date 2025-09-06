import React from 'react';

const SoundWaveBackground = () => {
  return (
    <div className="fixed inset-0 w-full h-full opacity-[0.08] z-[-1] pointer-events-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="soundwave" patternUnits="userSpaceOnUse" width="100" height="100">
            <path
              d="M 10 50 Q 25 25, 40 50 T 70 50 T 100 50"
              stroke="white"
              fill="none"
              strokeWidth="1"
              strokeLinecap="round"
            >
              <animate
                attributeName="d"
                values="M 10 50 Q 25 25, 40 50 T 70 50 T 100 50; M 10 50 Q 25 75, 40 50 T 70 50 T 100 50; M 10 50 Q 25 25, 40 50 T 70 50 T 100 50"
                dur="4s"
                repeatCount="indefinite"
              />
            </path>
            <path
              d="M 0 25 Q 15 40, 30 25 T 60 25 T 90 25"
              stroke="white"
              fill="none"
              strokeWidth="1"
              strokeLinecap="round"
            >
              <animate
                attributeName="d"
                values="M 0 25 Q 15 40, 30 25 T 60 25 T 90 25; M 0 25 Q 15 10, 30 25 T 60 25 T 90 25; M 0 25 Q 15 40, 30 25 T 60 25 T 90 25"
                dur="5s"
                repeatCount="indefinite"
              />
            </path>
          </pattern>
          <pattern id="soundwave2" patternUnits="userSpaceOnUse" width="150" height="150">
             <path
              d="M 5 75 Q 20 50, 35 75 T 65 75 T 95 75 T 125 75 T 155 75"
              stroke="white"
              fill="none"
              strokeWidth="1"
              strokeLinecap="round"
            >
               <animateTransform
                attributeName="transform"
                type="translate"
                values="0 0; 20 0; 0 0"
                dur="10s"
                repeatCount="indefinite"
              />
            </path>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#soundwave)" />
        <rect width="100%" height="100%" fill="url(#soundwave2)" opacity="0.5"/>
      </svg>
    </div>
  );
};

export default SoundWaveBackground;
