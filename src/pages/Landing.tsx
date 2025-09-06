import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <main className="relative z-10 grid place-items-center min-h-screen w-full text-center p-4">
      <motion.div
        className="max-w-4xl"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
        }}
      >
        <motion.h1
          className="text-6xl font-bold mb-4"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
          }}
        >
          The Universe of Afro Sounds
        </motion.h1>
        <motion.p
          className="mt-4 text-2xl font-semibold text-white/80"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
          }}
        >
          Create Afrobeats with AI. Earn while you play.
        </motion.p>
        <motion.p
          className="mt-6 max-w-2xl mx-auto text-white/70 font-light"
           variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
          }}
        >
          Afroverse lets you turn text into full Afrobeats songs in seconds — and compete in monthly contests where your creativity can win record deals, cash, and promo.
        </motion.p>

        <motion.div
          className="mt-10 flex justify-center gap-4"
           variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
          }}
        >
          <Button onClick={() => navigate('/register')}>Get Started</Button>
          <Button onClick={() => navigate('/login')} variant="outline">Login</Button>
        </motion.div>
      </motion.div>
    </main>
  );
}
