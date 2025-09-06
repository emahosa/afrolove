import React from 'react';

/* Place once at app root */
export function SoundwaveBackground() {
  return (
    <svg className="soundwave-bg" viewBox="0 0 1200 400" preserveAspectRatio="none">
      <g style={{ animation: 'drift 30s linear infinite' }}>
        <path d="M0,200 C150,120 300,280 450,200 600,120 750,280 900,200 1050,120 1200,200 1200,200"
              fill="none" stroke="white" strokeOpacity="1" strokeWidth="2" />
        {/* duplicate with slight offsets for parallax */}
        <path d="M0,230 C150,150 300,310 450,230 600,150 750,310 900,230 1050,150 1200,230 1200,230"
              fill="none" stroke="white" strokeOpacity=".6" strokeWidth="1.5" />
      </g>
    </svg>
  );
}
