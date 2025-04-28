
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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
import Admin from "./pages/Admin";
import CustomSongManagement from "./pages/CustomSongManagement";

// Layouts
import AppLayout from "./layouts/AppLayout";
import AuthLayout from "./layouts/AuthLayout";

// Protected Routes
import ProtectedRoute from "./components/ProtectedRoute";

const App = () => (
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
            
            {/* Admin routes */}
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/users" element={<Admin tab="users" />} />
            <Route path="/admin/admins" element={<Admin tab="admins" />} />
            <Route path="/admin/custom-songs" element={<CustomSongManagement />} />
            <Route path="/admin/api-keys" element={<Admin tab="apis" />} />
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
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
