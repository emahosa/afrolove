import React from 'react';
import AnimatedBackground from '@/components/ui/AnimatedBackground';

const AuthPageLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden text-white font-sans">
      <AnimatedBackground />
      <main className="relative z-10 grid place-items-center min-h-screen w-full p-4">
        {children}
      </main>
    </div>
  );
};

export default AuthPageLayout;
