import { useAuth } from "@/contexts/AuthContext";
import { useGenreTemplates } from "@/hooks/use-genre-templates";
import { GenreTemplateCard } from "@/components/dashboard/GenreTemplateCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const { user } = useAuth();
  const { templates, loading: templatesLoading } = useGenreTemplates();
  const [heroVideoUrl, setHeroVideoUrl] = useState<string | null>(null);
  const [loadingHeroVideo, setLoadingHeroVideo] = useState(true);

  useEffect(() => {
    fetchActiveHeroVideo();
  }, []);

  const fetchActiveHeroVideo = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'hero_video_active')
        .eq('category', 'hero_video')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching hero video:', error);
      } else if (data?.value) {
        const videoData = typeof data.value === 'string' ? data.value : data.value?.url;
        setHeroVideoUrl(videoData);
      }
    } catch (error) {
      console.error('Error fetching hero video:', error);
    } finally {
      setLoadingHeroVideo(false);
    }
  };

  return (
    <div className="relative">
      {/* Floating Notes */}
      {["🎵", "🎶", "🎼", "🎵", "🎶", "🎼"].map((note, i) => (
        <span
          key={i}
          className="absolute text-purple-400 text-3xl animate-float"
          style={{
            top: `${Math.random() * 90}%`,
            left: `${Math.random() * 90}%`,
            animationDuration: `${6 + i * 3}s`,
            zIndex: 0,
          }}
        >
          {note}
        </span>
      ))}

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="relative h-80 flex flex-col items-start justify-center text-left px-10 overflow-hidden">
          {/* Hero Video Background */}
          {heroVideoUrl && !loadingHeroVideo && (
            <div className="absolute inset-0 z-0">
              <video
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover opacity-30"
              >
                <source src={heroVideoUrl} type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-black/40"></div>
            </div>
          )}
          
          <div className="relative z-10">
            <h2 className="text-4xl font-bold mb-2">Unleash Your Sound</h2>
            <p className="text-gray-300 mb-6">Every Beat. Every Emotion. All in Your Control.</p>
            <div className="flex gap-4 justify-start">
              <Link to="/create">
                <Button
                  className="backdrop-blur-xl bg-white/10 border border-purple-400/30 text-purple-300 hover:bg-purple-400/20 px-6 py-3 rounded-2xl transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/50"
                >
                  Create Song
                </Button>
              </Link>
              <Link to="/contest">
                <Button
                  className="backdrop-blur-xl bg-white/10 border border-purple-400/30 text-purple-300 hover:bg-purple-400/20 px-6 py-3 rounded-2xl transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/50"
                >
                  Earn
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Welcome Back & Genres Section */}
        <section className="p-8">
          <h3 className="text-lg text-gray-200 mb-6">
            Welcome back, {user?.user_metadata?.full_name || 'User'}! Here’s what’s happening in your music journey
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {templatesLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-dark-purple"></div>
              </div>
            ) : (
              templates.map((template) => (
                <GenreTemplateCard key={template.id} template={template} />
              ))
            )}
          </div>
        </section>

        {/* Contest Banner */}
        <section className="bg-gradient-to-r from-purple-800 to-pink-600 text-center py-10 mt-10 rounded-2xl mx-8 shadow-lg">
          <h3 className="text-2xl font-bold">🎤 Join the Afroverse Contest!</h3>
          <p className="mt-2 text-gray-200">
            Win beats, prizes, and exposure for your music.
          </p>
          <Link to="/contest">
            <Button
              className="mt-4 backdrop-blur-xl bg-black/20 border border-white/30 text-white hover:bg-white/30 px-6 py-3 rounded-2xl transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg hover:shadow-white/50"
            >
              Enter Now
            </Button>
          </Link>
        </section>
      </div>

      {/* Floating Notes Animation Style */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0) rotate(0deg); opacity: 0.7; }
          50% { transform: translateY(-30px) rotate(10deg); opacity: 1; }
          100% { transform: translateY(0) rotate(-10deg); opacity: 0.7; }
        }
        .animate-float {
          animation: float infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
