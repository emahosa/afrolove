import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { MobileNav } from '@/components/MobileNav';
import { Home } from '@/pages/Home';
import { Pricing } from '@/pages/Pricing';
import { Contact } from '@/pages/Contact';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Profile } from '@/pages/Profile';
import { Admin } from '@/pages/Admin';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminRoute } from '@/components/AdminRoute';
import { Toaster } from "@/components/ui/toaster"
import { Subscribe } from '@/pages/Subscribe';
import { Terms } from '@/pages/Terms';
import { Privacy } from '@/pages/Privacy';
import { Faq } from '@/pages/Faq';
import { Blog } from '@/pages/Blog';
import { BlogArticle } from '@/pages/BlogArticle';
import { Community } from '@/pages/Community';
import { CommunityArticle } from '@/pages/CommunityArticle';
import { SubmitArticle } from '@/pages/SubmitArticle';
import { SubmitCommunityArticle } from '@/pages/SubmitCommunityArticle';
import { Dashboard } from '@/pages/Dashboard';
import { Upgrade } from '@/pages/Upgrade';
import { NotFound } from '@/pages/NotFound';
import { Unauthorized } from '@/pages/Unauthorized';
import Affiliate from '@/pages/Affiliate';
import AffiliateDashboard from '@/pages/AffiliateDashboard';
import SubscriptionUpgrade from '@/components/SubscriptionUpgrade';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-background">
          <Navbar />
          <main className="pb-16 md:pb-0">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/subscribe" element={<Subscribe />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:id" element={<BlogArticle />} />
              <Route path="/community" element={<Community />} />
              <Route path="/community/:id" element={<CommunityArticle />} />
              <Route path="/submit-article" element={<ProtectedRoute><SubmitArticle /></ProtectedRoute>} />
              <Route path="/submit-community-article" element={<ProtectedRoute><SubmitCommunityArticle /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/upgrade" element={<ProtectedRoute><Upgrade /></ProtectedRoute>} />
              <Route path="/unauthorized" element={<Unauthorized />} />
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
                  <AdminRoute>
                    <Admin />
                  </AdminRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
              
              <Route
                path="/subscription-upgrade"
                element={
                  <ProtectedRoute>
                    <SubscriptionUpgrade />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
          <MobileNav />
        </div>
        <Toaster />
      </AuthProvider>
    </Router>
  );
}

export default App;
