import React from 'react';
import SoundWaveBackground from '@/components/ui/soundwave-background';

const AuthPageLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative min-h-screen w-full bg-black text-white font-sans">
      <SoundWaveBackground />
      <main className="relative z-10 grid place-items-center min-h-screen w-full p-4">
        {children}
      </main>
    </div>
  );
};

export default AuthPageLayout;
