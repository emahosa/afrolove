import React from 'react';
import Navbar from '@/components/Navbar';

// Helper component for the floating icons
const FloatingIcon = ({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) => (
  <div
    className={`absolute text-dark-purple/30 motion-safe:animate-float ${className}`}
    style={style}
  >
    {children}
  </div>
);

const AuthPageLayout = ({ children }: { children: React.ReactNode }) => {
  // Using the same icons from the landing page for consistency
  const icons = [
    { symbol: "♪", size: "text-4xl", top: "20%", left: "10%", animationDuration: "8s" },
    { symbol: "♫", size: "text-6xl", top: "50%", left: "90%", animationDuration: "12s" },
    { symbol: "♯", size: "text-3xl", top: "80%", left: "5%", animationDuration: "10s" },
    { symbol: "𝄞", size: "text-7xl", top: "10%", left: "85%", animationDuration: "9s" },
    { symbol: "🥁", size: "text-5xl", top: "70%", left: "30%", animationDuration: "11s" },
    { symbol: "🌊", size: "text-4xl", top: "30%", left: "70%", animationDuration: "7s" },
    { symbol: "♭", size: "text-4xl", top: "5%", left: "40%", animationDuration: "13s" },
    { symbol: "🎶", size: "text-6xl", top: "90%", left: "75%", animationDuration: "9s" },
    { symbol: "🎤", size: "text-5xl", top: "40%", left: "5%", animationDuration: "10s" },
    { symbol: "🎸", size: "text-5xl", top: "85%", left: "50%", animationDuration: "14s" },
  ];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-midnight to-black text-white font-sans">
      {/* Background Floating Icons */}
      <div className="absolute inset-0 z-0 opacity-50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(74,0,109,0.2),rgba(255,255,255,0))]"></div>
        {icons.map((icon, i) => (
          <FloatingIcon
            key={i}
            className={icon.size}
            style={{ top: icon.top, left: icon.left, animationDuration: icon.animationDuration }}
          >
            {icon.symbol}
          </FloatingIcon>
        ))}
      </div>
      <Navbar onMenuClick={() => {}} />
      <main className="relative z-10 grid place-items-center min-h-screen w-full p-4">
        {children}
      </main>
    </div>
  );
};

export default AuthPageLayout;
