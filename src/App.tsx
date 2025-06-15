import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { AudioPlayer } from "@/components/AudioPlayer";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminRegister from "./pages/AdminRegister";
import Dashboard from "./pages/Dashboard";
import Create from "./pages/Create";
import Library from "./pages/Library";
import Contest from "./pages/Contest";
import Profile from "./pages/Profile";
import Credits from "./pages/Credits";
import Support from "./pages/Support";
import Admin from "./pages/Admin";
import CustomSongManagement from "./pages/CustomSongManagement";
import UserCustomSongs from "./pages/UserCustomSongs";
import UserCustomSongsManagement from "./pages/UserCustomSongsManagement";

// Layouts
import AppLayout from "./layouts/AppLayout";
import AuthLayout from "./layouts/AuthLayout";

// Protected Routes
import ProtectedRoute from "./components/ProtectedRoute";

const App = () => (
  <AuthProvider>
    <AudioPlayerProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            
            {/* Auth routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/register/admin" element={<AdminRegister />} />
            </Route>
            
            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/create" element={<Create />} />
                <Route path="/library" element={<Library />} />
                <Route path="/contest" element={<Contest />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/credits" element={<Credits />} />
                <Route path="/support" element={<Support />} />
                <Route path="/my-custom-songs" element={<UserCustomSongs />} />
                <Route path="/custom-songs-management" element={<UserCustomSongsManagement />} />
                
                {/* Admin routes */}
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/users" element={<Admin tab="users" />} />
                <Route path="/admin/admins" element={<Admin tab="admins" />} />
                <Route path="/admin/genres" element={<Admin tab="genres" />} />
                <Route path="/admin/custom-songs" element={<CustomSongManagement />} />
                <Route path="/admin/suno-api" element={<Admin tab="suno-api" />} />
                <Route path="/admin/api-keys" element={<Admin tab="suno-api" />} />
                <Route path="/admin/contest" element={<Admin tab="contest" />} />
                <Route path="/admin/content" element={<Admin tab="content" />} />
                <Route path="/admin/payments" element={<Admin tab="payments" />} />
                <Route path="/admin/support" element={<Admin tab="support" />} />
                <Route path="/admin/reports" element={<Admin tab="reports" />} />
                <Route path="/admin/settings" element={<Admin tab="settings" />} />
              </Route>
            </Route>
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <AudioPlayer />
        </BrowserRouter>
      </TooltipProvider>
    </AudioPlayerProvider>
  </AuthProvider>
);

export default App;
