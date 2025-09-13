
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { useState } from "react";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import WinnerTicker from "@/components/dashboard/WinnerTicker";

const AppLayoutContent = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-black text-white font-sans">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      {location.pathname === "/dashboard" && <WinnerTicker />}

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-48 p-0 flex flex-col bg-black border-r border-white/10">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block flex-shrink-0 w-48">
          <Sidebar className="bg-black border-r border-white/10" />
        </div>
        <main className="flex-1 flex flex-col overflow-y-auto">
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
