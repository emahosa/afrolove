import { Outlet } from "react-router-dom";
import NewNavbar from "@/components/NewNavbar";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { AudioPlayer } from "@/components/AudioPlayer";

const AppLayoutContent = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NewNavbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ paddingBottom: '120px' }}>
        <Outlet />
      </main>
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
