import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGenreTemplates } from "@/hooks/use-genre-templates";
import { GenreTemplateCard } from "@/components/dashboard/GenreTemplateCard";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const DashboardHero = () => {
  const navigate = useNavigate();
  return (
    <div className="relative w-full h-[400px] flex items-center justify-end text-right overflow-hidden rounded-2xl">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute z-0 w-auto min-w-full min-h-full max-w-none"
        src="/hero.mp4"
      />
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
          <Button onClick={() => navigate('/create')}>Get Started</Button>
          <Button variant="secondary">Learn More</Button>
        </div>
      </motion.div>
    </div>
  );
};


const Dashboard = () => {
  const { user } = useAuth();
  const { templates, loading: templatesLoading } = useGenreTemplates();

  return (
    <div className="h-full flex flex-col p-4 md:p-8 space-y-8">
      <DashboardHero />

      <div className="glass-surface">
        <div>
          <h2 className="text-2xl font-semibold text-white">Available Genres</h2>
          <p className="text-white/70">Choose from these genre templates to create your music</p>
        </div>

        {templatesLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white/50"></div>
          </div>
        ) : (
          <div
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6"
            style={{ perspective: "1000px" }}
          >
            {templates.map((template) => (
              <GenreTemplateCard key={template.id} template={template} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
