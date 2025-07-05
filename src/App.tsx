import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import UserLogin from "./pages/UserLogin";
import Register from "./pages/Register";
import AdminRegister from "./pages/AdminRegister";
import AdminLoginPage from "./pages/AdminLogin";
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
import BecomeAffiliatePage from "./pages/BecomeAffiliate";
import AffiliateDashboard from "./pages/AffiliateDashboard";
import SubscribePage from "./pages/SubscribePage";

// Layouts
import AppLayout from "./layouts/AppLayout";
import AuthLayout from "./layouts/AuthLayout";
import AdminLayout from "./layouts/AdminLayout";

// Protected Routes
import ProtectedRoute from "./components/ProtectedRoute";

import { useEffect } from 'react';
import { ensureStorageBuckets } from './utils/storageSetup';

const App = () => {
  useEffect(() => {
    // Initialize storage buckets on app start
    ensureStorageBuckets();
  }, []);
  
  return (
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            
            {/* Separate Auth routes for users and admins */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<UserLogin />} />
              <Route path="/register" element={<Register />} />
              <Route path="/register/admin" element={<AdminRegister />} />
            </Route>
            
            {/* Completely separate admin login route */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            
            {/* Protected routes with AppLayout (user interface) */}
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
                <Route path="/become-affiliate" element={<BecomeAffiliatePage />} />
                <Route path="/subscribe" element={<SubscribePage />} />
              </Route>
            </Route>

            {/* Admin routes - COMPLETELY SEPARATE with AdminLayout */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'super_admin']} />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/overview" element={<Admin tab="overview" />} />
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

            {/* Affiliate Panel Routes */}
            <Route element={<ProtectedRoute allowedRoles={['affiliate', 'admin', 'super_admin']} />}>
              <Route element={<AppLayout />}>
                <Route path="/affiliate" element={<AffiliateDashboard />} />
              </Route>
            </Route>
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
