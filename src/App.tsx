import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { initializeAffiliateTracking } from '@/utils/affiliateTracking';
import AdminLayout from './layouts/AdminLayout';
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Index from './pages/Index';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Contest from './pages/Contest';
import Subscription from './pages/Subscription';
import Profile from './pages/Profile';
import UserCustomSongs from './pages/UserCustomSongs';
import Support from './pages/Support';
import Affiliate from './pages/Affiliate';
import './App.css';

const queryClient = new QueryClient();

function App() {
  useEffect(() => {
    // Initialize affiliate tracking when app loads
    initializeAffiliateTracking();
  }, []);

  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Routes>
            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Admin />} />
              {/* Add other admin-specific routes here */}
            </Route>

            {/* User-facing Routes */}
            <Route
              path="/"
              element={
                <AppLayout />
              }
            >
              <Route index element={<Index />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route
                path="dashboard"
                element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
              />
              <Route
                path="contest"
                element={<ProtectedRoute><Contest /></ProtectedRoute>}
              />
              <Route
                path="subscription"
                element={<ProtectedRoute><Subscription /></ProtectedRoute>}
              />
              <Route path="subscribe" element={<Subscription />} />
              <Route path="credits" element={<Subscription />} />
              <Route
                path="profile"
                element={<ProtectedRoute><Profile /></ProtectedRoute>}
              />
              <Route
                path="my-custom-songs"
                element={<ProtectedRoute><UserCustomSongs /></ProtectedRoute>}
              />
              <Route
                path="support"
                element={<ProtectedRoute><Support /></ProtectedRoute>}
              />
              <Route
                path="affiliate"
                element={<ProtectedRoute><Affiliate /></ProtectedRoute>}
              />
            </Route>
          </Routes>
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </Router>
  );
}

export default App;
