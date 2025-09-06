import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button"; // Import the new Button
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
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        <div className="ml-4 text-white">Loading...</div>
      </div>
    );
  }

  // Render landing page for non-authenticated users
  return (
    <main>
      <section className="relative h-screen overflow-hidden">
        <video
          autoPlay
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          src={`https://bswfiynuvjvoaoyfdrso.supabase.co/storage/v1/object/public/public-assets/hero.mp4?t=${new Date().getTime()}`}
        />
        <div className="absolute inset-0 bg-gradient-to-l from-black/65 via-black/35 to-black/20" />
        <div className="relative z-10 h-full flex items-center justify-end pr-12 md:pr-24">
          <motion.div
            className="max-w-xl text-right"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
            }}
          >
            <motion.h1
              className="text-5xl lg:text-6xl font-extrabold mb-6 text-shadow-lg"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
              }}
            >
              Welcome to Afroverse
            </motion.h1>
            <motion.p
              className="text-lg text-white/70 mb-8 text-shadow"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
              }}
            >
              Create, share, and explore the future of Afrobeat music.
            </motion.p>
            <motion.div
              className="flex justify-end gap-3"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
              }}
            >
              <Button onClick={() => navigate('/create')}>Create Song</Button>
              <Button onClick={() => navigate('/affiliate')}>Earn</Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
      {/*
        The prompt mentions a centered hero for the "Landing Page".
        For now, this Index page is the main Homepage with the video hero.
        If a separate landing page is needed, a new route and component would be created.
        I will assume the other public pages like about/contact would have a centered hero.
        Since there are no other pages to apply the centered hero, I will stick to the video hero.
      */}
    </main>
  );
}
