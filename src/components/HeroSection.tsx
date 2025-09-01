
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { Link } from "react-router-dom";

const HeroSection: React.FC = () => {
  const [heroVideoUrl, setHeroVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHeroVideo();
  }, []);

  const fetchHeroVideo = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'hero_video_url')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setHeroVideoUrl(data.value);
      }
    } catch (error) {
      console.error('Error fetching hero video:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="relative h-[60vh] bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg overflow-hidden">
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <div className="animate-pulse text-white">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[60vh] bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg overflow-hidden">
      {heroVideoUrl ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={heroVideoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-secondary/40" />
      )}
      
      <div className="absolute inset-0 bg-black/40" />
      
      <div className="relative h-full flex items-center justify-center text-center text-white p-6">
        <div className="max-w-2xl space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight">
            Create Amazing Music
          </h1>
          <p className="text-xl md:text-2xl opacity-90">
            Join our contests and win incredible prizes while showcasing your talent
          </p>
          <Link to="/contests">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg">
              <Play className="mr-2 h-5 w-5" />
              Earn Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
