import React from 'react';

const AuthPageLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden text-white font-sans">
      <main className="relative z-10 grid place-items-center min-h-screen w-full p-4">
        {children}
      </main>
    </div>
  );
};

export default AuthPageLayout;
