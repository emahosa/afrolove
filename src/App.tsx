
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Index from './pages/Index';
import Support from './pages/Support';
import Admin from './pages/Admin';
import { Toaster } from 'sonner';

// Create a query client instance
const queryClient = new QueryClient();

function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleMenuClick = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <div className="min-h-screen bg-background">
            <Navbar onMenuClick={handleMenuClick} />
            <main className="pt-16">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/support" element={<Support />} />
                <Route path="/admin" element={<Admin />} />
              </Routes>
            </main>
            <Toaster />
          </div>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
