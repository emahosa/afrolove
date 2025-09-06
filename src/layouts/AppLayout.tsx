
import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { useState } from "react";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import AnimatedBackground from "@/components/ui/AnimatedBackground";

const AppLayoutContent = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col overflow-hidden text-white font-sans">
      <AnimatedBackground />
      <Navbar onMenuClick={() => setSidebarOpen(true)} />

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-60 p-0 flex flex-col bg-black/50 backdrop-blur-xl border-r border-white/10">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block flex-shrink-0">
          <Sidebar className="bg-black/50 backdrop-blur-xl border-r border-white/10" />
        </div>
        <main className="flex-1 flex flex-col overflow-y-auto" style={{ paddingBottom: '120px' }}>
          <Outlet />
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
