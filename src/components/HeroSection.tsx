import React from "react";
import { motion } from "framer-motion";
import SoundWaveBackground from "./ui/soundwave-background";

const SUPABASE_URL = "https://bswfiynuvjvoaoyfdrso.supabase.co";
const HERO_VIDEO_URL = `${SUPABASE_URL}/storage/v1/object/public/public-assets/hero.mp4`;

export default function HeroSection() {
  return (
    <div className="relative h-screen w-full flex items-center justify-end bg-black overflow-hidden">
      <SoundWaveBackground />
      {/* Background Video */}
      <video
        key={HERO_VIDEO_URL} // Add key to force re-render when URL changes
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-40"
      >
        <source src={HERO_VIDEO_URL} type="video/mp4" />
      </video>

      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-l from-black/80 to-transparent" />

      {/* Hero Content (Right Aligned) */}
      <motion.div
        className="relative z-10 max-w-xl text-right pr-16"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="text-5xl font-extrabold text-[#f8f8f8] mb-6">
          Welcome to Afroverse
        </h1>
        <p className="text-lg text-[#f8f8f8]/80 mb-8">
          Create, share, and explore the future of Afrobeat music.
        </p>
        <div className="flex justify-end gap-4">
          <button className="glass-btn">Get Started</button>
          <button className="glass-btn">Learn More</button>
        </div>
      </motion.div>
    </div>
  );
}
