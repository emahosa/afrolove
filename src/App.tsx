
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Profile from '@/pages/Profile';
import Admin from '@/pages/Admin';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Toaster } from "@/components/ui/toaster"
import Dashboard from '@/pages/Dashboard';
import NotFound from '@/pages/NotFound';
import Affiliate from '@/pages/Affiliate';
import AffiliateDashboard from '@/pages/AffiliateDashboard';
import SubscriptionUpgrade from '@/components/SubscriptionUpgrade';
import Index from '@/pages/Index';

function App() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-background">
          <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          <main className="pb-16 md:pb-0">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/affiliate" element={<ProtectedRoute><Affiliate /></ProtectedRoute>} />
              <Route path="/affiliate-dashboard" element={<ProtectedRoute><AffiliateDashboard /></ProtectedRoute>} />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <Admin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/subscription-upgrade"
                element={
                  <ProtectedRoute>
                    <SubscriptionUpgrade />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
        <Toaster />
      </AuthProvider>
    </Router>
  );
}

export default App;
