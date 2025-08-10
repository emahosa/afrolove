
import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { useState } from "react";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { AudioPlayer } from "@/components/AudioPlayer";

const AppLayoutContent = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8" style={{ paddingBottom: '120px' }}>
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
