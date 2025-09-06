import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { useState } from "react";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import SoundWaveBackground from "@/components/ui/soundwave-background";

const AppLayoutContent = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-black text-white font-sans">
      <SoundWaveBackground />
      <Navbar onMenuClick={() => setSidebarOpen(true)} />

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-60 p-0 flex flex-col bg-transparent border-r-0">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block flex-shrink-0">
          <Sidebar />
        </div>
        <main className="flex-1 flex flex-col overflow-y-auto" style={{ paddingBottom: '120px' }}>
          <div className="p-4 sm:p-6 lg:p-8 w-full">
            <Outlet />
          </div>
        </main>
      </div>
      <AudioPlayer />
    </div>
  );
};

const AppLayout = () => {
  return (
    <AudioPlayerProvider>
      <AppLayoutContent />
    </AudioPlayerProvider>
  );
};

export default AppLayout;
