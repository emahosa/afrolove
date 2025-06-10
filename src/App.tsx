
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminRegister from "./pages/AdminRegister";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Create from "./pages/Create";
import Library from "./pages/Library";
import Contest from "./pages/Contest";
import ContestEntries from "./pages/ContestEntries";
import Credits from "./pages/Credits";
import Profile from "./pages/Profile";
import Support from "./pages/Support";
import UserCustomSongs from "./pages/UserCustomSongs";
import UserCustomSongsManagement from "./pages/UserCustomSongsManagement";
import CustomSongManagement from "./pages/CustomSongManagement";
import NotFound from "./pages/NotFound";
import AppLayout from "./layouts/AppLayout";
import AuthLayout from "./layouts/AuthLayout";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public routes with auth layout */}
              <Route element={<AuthLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/admin-register" element={<AdminRegister />} />
              </Route>

              {/* Protected routes with app layout */}
              <Route element={<AppLayout />}>
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <Admin />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/create" 
                  element={
                    <ProtectedRoute>
                      <Create />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/library" 
                  element={
                    <ProtectedRoute>
                      <Library />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/contest" 
                  element={
                    <ProtectedRoute>
                      <Contest />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/contest/:contestId/entries" 
                  element={
                    <ProtectedRoute>
                      <ContestEntries />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/credits" 
                  element={
                    <ProtectedRoute>
                      <Credits />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/support" 
                  element={
                    <ProtectedRoute>
                      <Support />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/user-custom-songs" 
                  element={
                    <ProtectedRoute>
                      <UserCustomSongs />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/user-custom-songs-management" 
                  element={
                    <ProtectedRoute>
                      <UserCustomSongsManagement />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/custom-song-management" 
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <CustomSongManagement />
                    </ProtectedRoute>
                  } 
                />
              </Route>

              {/* 404 route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
