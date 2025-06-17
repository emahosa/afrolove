
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/layouts/AppLayout";
import AuthLayout from "@/layouts/AuthLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

// Page imports
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Create from "./pages/Create";
import Library from "./pages/Library";
import Credits from "./pages/Credits";
import Contest from "./pages/Contest";
import Profile from "./pages/Profile";
import Support from "./pages/Support";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminRegister from "./pages/AdminRegister";
import Admin from "./pages/Admin";
import CustomSongManagement from "./pages/CustomSongManagement";
import UserCustomSongs from "./pages/UserCustomSongs";
import UserCustomSongsManagement from "./pages/UserCustomSongsManagement";
import NotFound from "./pages/NotFound";
import Affiliate from "./pages/Affiliate";
import AffiliateApplication from "./pages/AffiliateApplication";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            {/* Auth routes */}
            <Route path="/" element={<AuthLayout />}>
              <Route index element={<Index />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="admin-register" element={<AdminRegister />} />
            </Route>

            {/* Protected routes */}
            <Route path="/" element={<ProtectedRoute />}>
              <Route path="/" element={<AppLayout />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="create" element={<Create />} />
                <Route path="library" element={<Library />} />
                <Route path="credits" element={<Credits />} />
                <Route path="contest" element={<Contest />} />
                <Route path="profile" element={<Profile />} />
                <Route path="support" element={<Support />} />
                <Route path="admin" element={<Admin />} />
                <Route path="custom-songs" element={<CustomSongManagement />} />
                <Route path="user-custom-songs" element={<UserCustomSongs />} />
                <Route path="user-custom-songs-management" element={<UserCustomSongsManagement />} />
                <Route path="affiliate" element={<Affiliate />} />
                <Route path="affiliate/apply" element={<AffiliateApplication />} />
              </Route>
            </Route>

            {/* 404 route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
