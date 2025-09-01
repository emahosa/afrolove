"use client";

import { useEffect, useState } from "react";
import { Music, Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ContestWinnerBanner from "@/components/contest/ContestWinnerBanner";
import { supabase } from "@/integrations/supabase/client";
import { AspectRatio } from "@/components/ui/aspect-ratio";

// Helper component for the floating icons
const FloatingIcon = ({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) => (
  <div
    className={`absolute text-dark-purple/30 motion-safe:animate-float ${className}`}
    style={style}
  >
    {children}
  </div>
);

export default function Index() {
  const navigate = useNavigate();
  const { user, loading, isAdmin, isSuperAdmin } = useAuth();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [heroVideoUrl, setHeroVideoUrl] = useState('');

  useEffect(() => {
    const fetchHeroVideoUrl = async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'homepage_hero_video_url')
        .single();

      if (error) {
        console.error('Error fetching hero video URL:', error);
      } else if (data) {
        setHeroVideoUrl(data.value);
      }
    };

    fetchHeroVideoUrl();
  }, []);

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

  // More background icons
  const icons = [
    { symbol: "♪", size: "text-4xl", top: "20%", left: "10%", animationDuration: "8s" },
    { symbol: "♫", size: "text-6xl", top: "50%", left: "90%", animationDuration: "12s" },
    { symbol: "♯", size: "text-3xl", top: "80%", left: "5%", animationDuration: "10s" },
    { symbol: "𝄞", size: "text-7xl", top: "10%", left: "85%", animationDuration: "9s" },
    { symbol: "🥁", size: "text-5xl", top: "70%", left: "30%", animationDuration: "11s" },
    { symbol: "🌊", size: "text-4xl", top: "30%", left: "70%", animationDuration: "7s" },
    { symbol: "♭", size: "text-4xl", top: "5%", left: "40%", animationDuration: "13s" },
    { symbol: "🎶", size: "text-6xl", top: "90%", left: "75%", animationDuration: "9s" },
    { symbol: "🎤", size: "text-5xl", top: "40%", left: "5%", animationDuration: "10s" },
    { symbol: "🎸", size: "text-5xl", top: "85%", left: "50%", animationDuration: "14s" },
  ];

  const handleNoConfirm = () => {
    setShowConfirmModal(false);
    alert("sorry not Available try again in 30 days");
  }

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-dark-purple"></div>
        <div className="ml-4 text-white">Loading...</div>
      </div>
    );
  }

  // Render landing page for non-authenticated users
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-midnight to-black text-white font-sans">
      {/* Background Floating Icons */}
      <div className="absolute inset-0 z-0 opacity-50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(74,0,109,0.2),rgba(255,255,255,0))]"></div>
        {icons.map((icon, i) => (
          <FloatingIcon
            key={i}
            className={icon.size}
            style={{ top: icon.top, left: icon.left, animationDuration: icon.animationDuration }}
          >
            {icon.symbol}
          </FloatingIcon>
        ))}
      </div>

      <main className="relative z-10 grid place-items-center min-h-screen w-full text-center p-4">
        <div>
            {/* New Hero Section */}
            <section className="w-full max-w-4xl">
              {heroVideoUrl && (
                <AspectRatio ratio={16 / 9} className="bg-muted">
                  <video
                    src={heroVideoUrl}
                    autoPlay
                    muted
                    loop
                    className="w-full h-full object-cover rounded-lg"
                  />
                </AspectRatio>
              )}
              <div className="mt-10 flex justify-center">
                <button
                  onClick={() => navigate('/contest')}
                  className="px-8 py-4 bg-dark-purple rounded-lg font-bold text-white hover:bg-opacity-90 transition-all duration-300"
                >
                  Earn
                </button>
              </div>
            </section>
            <ContestWinnerBanner />
        </div>
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center px-4 z-50">
          <div className="bg-gradient-to-br from-midnight to-gray-900 border border-dark-purple/50 rounded-xl p-8 max-w-md w-full text-center">
            <h3 className="text-xl font-bold text-white">This service costs $5</h3>
            <p className="text-gray-400 text-sm mt-2">
              Do you want to proceed?
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-2 bg-dark-purple rounded-lg hover:bg-opacity-90 font-semibold text-white transition"
              >
                Yes
              </button>
              <button
                onClick={handleNoConfirm}
                className="px-6 py-2 bg-gray-600 rounded-lg hover:bg-gray-700 font-semibold text-white transition"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
