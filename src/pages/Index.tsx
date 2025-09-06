"use client";

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AnimatedBackground from "@/components/ui/AnimatedBackground";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function Index() {
  const navigate = useNavigate();
  const { user, loading, isAdmin, isSuperAdmin } = useAuth();

  // Redirect authenticated users to appropriate dashboard
  useEffect(() => {
    if (!loading && user) {
      if (isAdmin() || isSuperAdmin()) {
        navigate("/admin", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, loading, navigate, isAdmin, isSuperAdmin]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white/50"></div>
        <div className="ml-4 text-white">Loading...</div>
      </div>
    );
  }

  // Render landing page for non-authenticated users
  return (
    <div className="relative min-h-screen w-full overflow-hidden text-white font-sans">
      <AnimatedBackground />
      <main className="relative z-10 grid place-items-center min-h-screen w-full text-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="flex flex-col items-center"
        >
          <h1 className="text-5xl md:text-7xl font-extrabold text-[#f8f8f8] mb-6">
            Welcome to Afroverse
          </h1>
          <p className="text-lg md:text-xl text-white/70 mb-8 max-w-2xl">
            Create, share, and explore the future of Afrobeat music.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button onClick={() => navigate('/register')} size="lg">Get Started</Button>
            <Button onClick={() => navigate('/#about')} variant="secondary" size="lg">Learn More</Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
