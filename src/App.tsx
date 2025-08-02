
import React, { useEffect } from 'react';
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// Public Routes
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Credits from "./pages/Credits";
import Library from "./pages/Library";
import Create from "./pages/Create";
import Dashboard from "./pages/Dashboard";
import Contests from "./pages/Contests";
import ContestDetail from "./pages/ContestDetail";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminContests from "./pages/AdminContests";
import AdminGenres from "./pages/AdminGenres";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminSettings from "./pages/AdminSettings";
import AdminSupport from "./pages/AdminSupport";
import SupportTickets from "./pages/SupportTickets";
import CreateSupportTicket from "./pages/CreateSupportTicket";
import SupportTicketDetail from "./pages/SupportTicketDetail";
import BecomeAffiliate from "./pages/BecomeAffiliate";
import AffiliateDashboard from "./pages/AffiliateDashboard";
import AdminAffiliates from "./pages/AdminAffiliates";
import AdminPayoutRequests from "./pages/AdminPayoutRequests";

// Protected Routes
import ProtectedRoute from "./components/ProtectedRoute";

import { ensureStorageBuckets } from './utils/storageSetup';

const App = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });

  useEffect(() => {
    ensureStorageBuckets();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <div className="min-h-screen bg-background flex flex-col">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/become-affiliate" element={<BecomeAffiliate />} />

                  {/* Protected Routes */}
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/credits" element={<ProtectedRoute><Credits /></ProtectedRoute>} />
                  <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
                  <Route path="/create" element={<ProtectedRoute><Create /></ProtectedRoute>} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/contests" element={<ProtectedRoute><Contests /></ProtectedRoute>} />
                  <Route path="/contests/:id" element={<ProtectedRoute><ContestDetail /></ProtectedRoute>} />
                  <Route path="/affiliate" element={<ProtectedRoute><AffiliateDashboard /></ProtectedRoute>} />

                  {/* Support Routes */}
                  <Route path="/support" element={<ProtectedRoute><SupportTickets /></ProtectedRoute>} />
                  <Route path="/support/new" element={<ProtectedRoute><CreateSupportTicket /></ProtectedRoute>} />
                  <Route path="/support/:id" element={<ProtectedRoute><SupportTicketDetail /></ProtectedRoute>} />

                  {/* Admin Routes */}
                  <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                  <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
                  <Route path="/admin/contests" element={<ProtectedRoute><AdminContests /></ProtectedRoute>} />
                  <Route path="/admin/genres" element={<ProtectedRoute><AdminGenres /></ProtectedRoute>} />
                  <Route path="/admin/analytics" element={<ProtectedRoute><AdminAnalytics /></ProtectedRoute>} />
                  <Route path="/admin/settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
                  <Route path="/admin/support" element={<ProtectedRoute><AdminSupport /></ProtectedRoute>} />
                  <Route path="/admin/affiliates" element={<ProtectedRoute><AdminAffiliates /></ProtectedRoute>} />
                  <Route path="/admin/affiliate-payouts" element={<ProtectedRoute><AdminPayoutRequests /></ProtectedRoute>} />
                </Routes>
              </main>
              <Footer />
            </div>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
