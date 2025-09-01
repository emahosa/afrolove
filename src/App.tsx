import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Index from './pages/Index';
import Auth from './pages/Auth';
import CreateMusic from './pages/CreateMusic';
import MySongs from './pages/MySongs';
import Contests from './pages/Contests';
import ContestDetail from './pages/ContestDetail';
import MyContests from './pages/MyContests';
import CustomSongs from './pages/CustomSongs';
import Pricing from './pages/Pricing';
import Support from './pages/Support';
import Admin from './pages/Admin';
import { Toaster } from 'sonner';
import { QueryClient } from '@tanstack/react-query';

function App() {
  return (
    <QueryClient>
      <BrowserRouter>
        <AuthProvider>
          <div className="min-h-screen bg-background">
            <Navbar />
            <main className="pt-16">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/create" element={<CreateMusic />} />
                <Route path="/my-songs" element={<MySongs />} />
                <Route path="/contests" element={<Contests />} />
                <Route path="/contests/:id" element={<ContestDetail />} />
                <Route path="/my-contests" element={<MyContests />} />
                <Route path="/custom-songs" element={<CustomSongs />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/support" element={<Support />} />
                <Route path="/admin" element={<Admin />} />
              </Routes>
            </main>
            <Toaster />
          </div>
        </AuthProvider>
      </BrowserRouter>
    </QueryClient>
  );
}

export default App;
