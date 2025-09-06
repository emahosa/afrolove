// src/pages/Dashboard.tsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Star, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";

type CardProps = {
  title: string;
  category: string;
  image: string;
};

const cards: CardProps[] = [
  { title: "Afro-Rnb Epic", category: "Afro-RnB", image: "/images/afro-rnb.jpg" },
  { title: "South African Amapiano", category: "Afrobeats", image: "/images/amapiano.jpg" },
  { title: "Sad Afro-Rnb", category: "Afrobeats", image: "/images/sad-rnb.jpg" },
];

export default function Dashboard() {
  const [activeCard, setActiveCard] = useState<number | null>(null);

  return (
    <Layout active="Home">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold">Unleash Your Sound</h2>
          <p className="text-gray-400">Every Beat. Every Emotion. All in Your Control.</p>
        </div>
        <div className="flex items-center gap-4">
          <Button className="glass-btn">Manage Plan</Button>
          <div className="flex items-center gap-2">
            <Star className="text-yellow-400" /> <span>299</span>
          </div>
          <Bell className="text-gray-400" />
          <div className="bg-green-600 rounded-full w-8 h-8 flex items-center justify-center">
            FR
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-4 mb-10">
        <Button className="glass-btn">Create Song</Button>
        <Button className="glass-btn">Earn</Button>
      </div>

      {/* Cards */}
      <h3 className="text-lg text-gray-400 mb-4">
        Welcome back, fret! Here’s what’s happening in your music journey
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card, idx) => (
          <motion.div
            key={idx}
            onClick={() => setActiveCard(idx === activeCard ? null : idx)}
            className="relative rounded-2xl overflow-hidden cursor-pointer glass-card"
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5, scale: 1.05 }}
            whileTap={{ scale: 0.95, zIndex: 10 }}
          >
            <img src={card.image} alt={card.title} className="w-full h-48 object-cover" />
            <div className="p-4">
              <h4 className="font-semibold">{card.title}</h4>
              <p className="text-sm text-gray-400">{card.category}</p>
              <div className="flex gap-2 mt-3">
                <Button className="glass-btn px-3 py-1">Preview</Button>
                <Button className="glass-btn px-3 py-1">Use Template</Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Layout>
  );
}
