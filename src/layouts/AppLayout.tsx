
import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { AudioPlayer } from "@/components/AudioPlayer";

const AppLayoutContent = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8" style={{ paddingBottom: '120px' }}>
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
