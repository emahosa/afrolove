import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useGenreTemplates } from "@/hooks/use-genre-templates";
import { GenreTemplateCard } from "@/components/dashboard/GenreTemplateCard";

export default function Dashboard() {
  const { user } = useAuth();
  const { templates, loading: templatesLoading } = useGenreTemplates();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative h-[50vh] w-full overflow-hidden flex items-center justify-center rounded-b-3xl">
        <video
          autoPlay
          loop
          playsInline
          className="absolute top-0 left-0 w-full h-full object-cover"
        >
          <source src="/media/afroverse-hero.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/50" />

        <div className="relative z-10 text-center px-6">
          <motion.h1
            className="text-5xl font-extrabold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Create Your Afrobeats with A.I
          </motion.h1>

          <motion.p
            className="mt-4 text-lg text-gray-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            Turn your ideas into music with Afroverse’s AI-powered templates
          </motion.p>

          <motion.p
            className="mt-2 text-md text-gray-400"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2 }}
          >
            Welcome back, {user?.user_metadata?.full_name || 'User'}!
          </motion.p>

          <div className="mt-6 flex gap-4 justify-center">
            <a
              href="/create"
              className="bg-purple-600 hover:bg-purple-700 rounded-2xl px-6 py-3 text-lg font-semibold shadow-lg transition"
            >
              Start Creating
            </a>
            <a
              href="/contest"
              className="border border-white text-white rounded-2xl px-6 py-3 text-lg font-semibold hover:bg-white/10 transition"
            >
              Earn Now
            </a>
          </div>
        </div>
      </section>

      {/* Genres Section */}
      <section className="px-10 py-16">
        <h2 className="text-3xl font-bold mb-8">Available Genres</h2>
        {templatesLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-dark-purple"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template, i) => (
              <GenreTemplateCard key={template.id} template={template} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* Contest Banner */}
      <section className="bg-gradient-to-r from-purple-800 to-pink-600 text-center py-10 mt-10 rounded-2xl mx-10 shadow-lg">
        <h3 className="text-2xl font-bold">🎤 Join the Afroverse Contest!</h3>
        <p className="mt-2 text-gray-200">
          Win beats, prizes, and exposure for your music.
        </p>
        <a
          href="/contest"
          className="mt-4 inline-block bg-black hover:bg-gray-900 text-white rounded-2xl px-6 py-3 font-semibold transition"
        >
          Enter Now
        </a>
      </section>
    </div>
  );
}
