import { useAuth } from "@/contexts/AuthContext";
import { useGenreTemplates } from "@/hooks/use-genre-templates";
import { GenreTemplateCard } from "@/components/dashboard/GenreTemplateCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { user } = useAuth();
  const { templates, loading: templatesLoading } = useGenreTemplates();

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white flex relative overflow-hidden">
      {/* Floating Notes */}
      {["🎵", "🎶", "🎼"].map((note, i) => (
        <span
          key={i}
          className="absolute text-purple-400 text-3xl animate-float"
          style={{
            top: `${Math.random() * 90}%`,
            left: `${Math.random() * 90}%`,
            animationDuration: `${6 + i * 3}s`,
          }}
        >
          {note}
        </span>
      ))}

      {/* Sidebar */}
      <aside className="w-60 bg-black/70 border-r border-purple-700/30 flex flex-col p-4 z-10">
        <h1 className="text-purple-400 font-bold text-2xl mb-8">🎵 Afroverse</h1>
        <nav className="space-y-4">
          {["Home", "Create", "Library", "Contest", "Profile", "Billing", "Support"].map((item) => (
            <Link
              key={item}
              to={`/${item.toLowerCase()}`}
              className="flex items-center text-gray-300 hover:text-purple-400 transition-all duration-300 ease-in-out transform hover:scale-105"
            >
              {item}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto z-10">
        {/* Hero Section */}
        <section className="relative h-80 flex flex-col items-center justify-center text-center">
          <div className="relative z-10">
            <h2 className="text-4xl font-bold mb-2">Unleash Your Sound</h2>
            <p className="text-gray-300 mb-6">Every Beat. Every Emotion. All in Your Control.</p>
            <div className="flex gap-4 justify-center">
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

        {/* Welcome Back */}
        <section className="p-8">
          <h3 className="text-lg text-gray-200 mb-6">
            Welcome back, {user?.user_metadata?.full_name || 'fret'}! Here’s what’s happening in your music journey
          </h3>

          {/* Available Genres */}
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
      </main>

      {/* Floating Notes Animation Style */}
      <style jsx>{`
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
