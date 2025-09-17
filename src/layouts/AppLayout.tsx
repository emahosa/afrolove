
import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { useState, useEffect } from "react";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, userRoles, loading, logout } = useAuth();

  useEffect(() => {
    // This effect handles the logout action without blocking render.
    if (!loading && user && (userRoles.includes('admin') || userRoles.includes('super_admin'))) {
      toast.error("Admins must use the dedicated admin login page.");
      logout();
    }
  }, [user, userRoles, loading, logout]);

  // Render a loading state to prevent UI flicker
  if (loading) {
    return <div className="h-screen w-full bg-black" />; // Or a spinner
  }

  // If the user is an admin, render nothing while the logout is processed by the useEffect.
  if (user && (userRoles.includes('admin') || userRoles.includes('super_admin'))) {
    return null;
  }

  // If the user is not an admin and loading is complete, render the dashboard.
  return (
    <AudioPlayerProvider>
      <div className="h-screen flex flex-col bg-black text-white font-sans">
        <div className="flex flex-1">
          {/* Desktop Sidebar */}
          <div className="hidden md:block flex-shrink-0 w-24">
            <Sidebar className="bg-black border-r border-white/10" />
          </div>

          <div className="flex-1 flex flex-col">
            <Navbar onMenuClick={() => setSidebarOpen(true)} />
            <main className="flex-1 overflow-y-auto">
              <Outlet />
            </main>
          </div>
        </div>
        <AudioPlayer />

        {/* Mobile Sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-24 p-0 flex flex-col bg-black border-r border-white/10">
            <Sidebar />
          </SheetContent>
        </Sheet>
      </div>
    </AudioPlayerProvider>
  );
};

export default AppLayout;
