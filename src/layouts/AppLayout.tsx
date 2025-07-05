
import React from 'react';
import Sidebar from '@/components/Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="pt-16 md:pt-0 px-4 md:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
