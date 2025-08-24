import React from 'react';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 text-gray-800 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-6 py-3 flex justify-between items-center">
          <div className="text-2xl font-bold text-gray-900">
            Reve Image
          </div>
          <nav className="hidden md:flex space-x-8">
            <a href="#explore" className="text-gray-600 hover:text-gray-900">Explore</a>
            <a href="#about" className="text-gray-600 hover:text-gray-900">About</a>
            <a href="#models" className="text-gray-600 hover:text-gray-900">Models</a>
            <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
            <a href="#community" className="text-gray-600 hover:text-gray-900">Community</a>
          </nav>
          <div>
            <Link to="/login">
              <Button variant="outline" className="mr-2">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button>Try Now</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-6xl font-extrabold text-gray-900 leading-tight">
            Reve Image 1.0
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            Experience unparalleled prompt fidelity, stunning aesthetics, and precise typography in your creations.
          </p>
          <div className="mt-8">
            <Link to="/register">
              <Button size="lg" className="text-lg px-8 py-6">Get Started</Button>
            </Link>
          </div>
        </motion.div>

        {/* Prompt Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-16 max-w-2xl mx-auto"
        >
          <div className="relative">
            <input
              type="text"
              placeholder="Describe your vision..."
              className="w-full pl-6 pr-32 py-4 text-lg border-2 border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
            <Button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-6 py-2 text-base">
              Generate
            </Button>
          </div>
          <div className="mt-4 flex justify-center space-x-4 text-sm text-gray-500">
            <span>Aspect Ratio: 16:9</span>
            <span>Model: Reve 1.0</span>
            <span>Style: Photorealistic</span>
          </div>
        </motion.div>
      </main>

      {/* Gallery Section */}
      <section id="explore" className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
            Featured Creations
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                className="group relative rounded-lg overflow-hidden shadow-lg"
                whileHover={{ scale: 1.05, zIndex: 10 }}
                transition={{ duration: 0.3 }}
              >
                <img src={`https://picsum.photos/seed/${i+1}/600/600`} alt={`Artwork ${i + 1}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                  <h3 className="text-white font-bold text-lg">Artwork Title</h3>
                  <p className="text-gray-300 text-sm truncate">A detailed prompt used to create this beautiful artwork.</p>
                  <Button variant="secondary" size="sm" className="mt-2 self-start">Recreate</Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="container mx-auto px-6 text-center">
          <p>&copy; 2024 Reve Image. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
