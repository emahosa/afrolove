"use client";

import { useState, useEffect } from "react";
import { Music, Coins } from "lucide-react";

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
    className={`absolute text-neon-purple/30 motion-safe:animate-float ${className}`}
    style={style}
  >
    {children}
  </div>
);

export default function Index() {
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [joining, setJoining] = useState(false);
  // Using the state from the original user-provided code
  const [spotsLeft, setSpotsLeft] = useState(250);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  // Background icons data
  const icons = [
    { symbol: "♪", size: "text-4xl", top: "20%", left: "10%", animationDuration: "8s" },
    { symbol: "♫", size: "text-6xl", top: "50%", left: "90%", animationDuration: "12s" },
    { symbol: "♯", size: "text-3xl", top: "80%", left: "5%", animationDuration: "10s" },
    { symbol: "𝄞", size: "text-7xl", top: "10%", left: "85%", animationDuration: "9s" },
    { symbol: "🥁", size: "text-5xl", top: "70%", left: "30%", animationDuration: "11s" },
    { symbol: "🌊", size: "text-4xl", top: "30%", left: "70%", animationDuration: "7s" },
  ];

  useEffect(() => {
    const cohortStart = new Date();
    const end = new Date(cohortStart.getTime() + 30 * 24 * 60 * 60 * 1000);

    const tick = () => {
      const diff = end.getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeLeft("0d 0h");
        return;
      }
      const d = Math.floor(diff / (24 * 3600 * 1000));
      const h = Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000));
      setTimeLeft(`${d}d ${h}h`);
    };

    tick();
    const timer = setInterval(tick, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      alert("Enter a valid email");
      return;
    }
    setJoining(true);

    try {
      // TODO: hook into Supabase or /api/early-access
      await new Promise((r) => setTimeout(r, 1000));

      alert("You're in. Check your email shortly for access instructions.");
      setShowModal(false);
      setEmail("");
      setSpotsLeft((s) => Math.max(0, s - 1));
    } catch (err) {
      alert("There was an error. Try again later.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-midnight to-black text-white font-poppins">
      {/* Background Floating Icons */}
      <div className="absolute inset-0 z-0 opacity-50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(138,60,255,0.3),rgba(255,255,255,0))]"></div>
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

      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
        {/* Hero Section */}
        <section className="w-full max-w-4xl">
          <h1 className="text-7xl font-extrabold bg-gradient-to-r from-neon-purple-start to-neon-purple-end bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(138,60,255,0.5)]">
            Afroverse
          </h1>
          <p className="mt-4 text-2xl font-bold text-gray-100">
            Create Afrobeats with AI. Earn while you play.
          </p>
          <p className="mt-6 max-w-2xl mx-auto text-gray-400 font-light">
            Afroverse lets you turn text into full Afrobeats songs in seconds — and compete in monthly contests where your creativity can win record deals, cash, and promo.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
            <button
              onClick={() => setShowModal(true)}
              className="px-8 py-4 bg-neon-purple rounded-lg font-bold text-white shadow-[0_0_20px_theme(colors.neon-purple.start)] hover:shadow-[0_0_30px_theme(colors.neon-purple.start)] transition-shadow duration-300"
            >
              Claim Early Access
            </button>
            <a
              href="#features"
              className="px-8 py-4 border border-white/30 rounded-lg font-semibold text-white/80 hover:bg-white/10 transition-colors"
            >
              See How It Works
            </a>
          </div>

          <div className="mt-6 text-sm text-gray-500">
            30 days early access only. Limited creator slots available.
          </div>
        </section>

        {/* Secondary Section */}
        <section id="features" className="w-full max-w-4xl mt-32 grid md:grid-cols-2 gap-8 text-left">
          <div className="bg-white/5 p-6 rounded-xl border border-white/10 backdrop-blur-sm">
            <div className="text-3xl mb-4 text-neon-purple" style={{ textShadow: '0 0 15px #8A3CFF' }}>
              <Music size={40} />
            </div>
            <h3 className="text-xl font-bold text-white">Create</h3>
            <p className="text-gray-400 mt-2 font-light">
              Turn simple prompts into hit Afrobeats tracks — ready to share, remix, or take to the studio.
            </p>
          </div>

          <div className="bg-white/5 p-6 rounded-xl border border-white/10 backdrop-blur-sm">
            <div className="text-3xl mb-4 text-neon-purple" style={{ textShadow: '0 0 15px #8A3CFF' }}>
              <Coins size={40} />
            </div>
            <h3 className="text-xl font-bold text-white">Earn</h3>
            <p className="text-gray-400 mt-2 font-light">
              Join contests to win cash prizes, studio deals, and real record opportunities. Afroverse rewards creativity.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 mt-32 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} Afroverse · Early Access
        </footer>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center px-4 z-50">
          <div className="bg-gradient-to-br from-midnight to-gray-900 border border-neon-purple/50 rounded-xl p-8 max-w-md w-full shadow-2xl shadow-neon-purple/20">
            <h3 className="text-xl font-bold text-white">Claim 30-Day Early Access</h3>
            <p className="text-gray-400 text-sm mt-2">
              Enter your email to unlock early access. Invitations sent within 24h.
              <br />
              {timeLeft && <span>Time left: {timeLeft}</span>} • <span>{spotsLeft} spots left</span>
            </p>
            <form onSubmit={handleJoin} className="mt-6 flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                required
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:ring-2 focus:ring-neon-purple focus:border-neon-purple outline-none transition"
              />
              <button
                type="submit"
                disabled={joining}
                className="px-6 py-3 bg-neon-purple rounded-lg hover:bg-neon-purple-end font-semibold text-white disabled:bg-gray-600 disabled:cursor-not-allowed transition"
              >
                {joining ? "Joining…" : "Join"}
              </button>
            </form>
            <button
              onClick={() => setShowModal(false)}
              className="mt-4 text-sm text-gray-500 hover:text-gray-300 w-full text-center"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
