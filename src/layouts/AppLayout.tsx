
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
  const { user, isAdmin, isSuperAdmin, signOut } = useAuth();

  useEffect(() => {
    if (user && (isAdmin() || isSuperAdmin())) {
      toast.error("Admins are not allowed in the user dashboard. Please use the admin login.");
      signOut();
    }
  }, [user, isAdmin, isSuperAdmin, signOut]);

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
