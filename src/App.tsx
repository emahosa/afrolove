import React, { useEffect } from 'react';
import { useAffiliateTracking } from './hooks/useAffiliateTracking';
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PaymentVerificationProvider } from "@/components/payment/PaymentVerificationProvider";
import ErrorBoundary from "@/components/ErrorBoundary";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
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
import AffiliatePage from "./pages/Affiliate";
import SubscribePage from "./pages/SubscribePage";

// Layouts
import AppLayout from "./layouts/AppLayout";
import AuthLayout from "./layouts/AuthLayout";
import AdminLayout from "./layouts/AdminLayout";

// Protected Routes
import ProtectedRoute from "./components/ProtectedRoute";

import { ensureStorageBuckets } from './utils/storageSetup';

const App = () => {
  useAffiliateTracking();

  useEffect(() => {
    ensureStorageBuckets();
  }, []);
  
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <PaymentVerificationProvider>
            <TooltipProvider>
              <Toaster />
              <Routes>
                <Route path="/" element={<Index />} />
                
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/register/admin" element={<AdminRegister />} />
                </Route>
                
                <Route path="/admin/login" element={<AdminLoginPage />} />
                
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
                    <Route path="/affiliate" element={<AffiliatePage />} />
                    <Route path="/subscribe" element={<SubscribePage />} />
                  </Route>
                </Route>

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
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </PaymentVerificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
