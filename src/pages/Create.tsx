// src/pages/Create.tsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Search, Heart, MoreVertical, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";

type WorkspaceItem = {
  title: string;
  tags: string[];
  duration?: string;
  image: string;
};

const workspaceItems: WorkspaceItem[] = [
  { title: "Joyous Celebration", tags: ["Afrobeat", "Afropop", "Soulful female"], image: "/images/joyous.jpg" },
  { title: "Sunset Serenade", tags: ["Amapiano", "Chill", "Instruments"], duration: "3:28", image: "/images/sunset.jpg" },
  { title: "Heartbeat", tags: ["Afrobeat", "Smooth", "Instruments"], image: "/images/heartbeat.jpg" },
  { title: "Dance to the Rhythm", tags: ["Afropop", "Inspirational", "Instruments"], image: "/images/dance.jpg" },
  { title: "Afro Blues", tags: ["Afrobeat", "Blues", "Instruments"], image: "/images/afroblues.jpg" },
];

export default function CreatePage() {
  const [description, setDescription] = useState("A vibrant Afrobeat track celebrating the joy of life");

  return (
    <Layout active="Create">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Song Creator */}
        <motion.div
          className="p-6 rounded-2xl glass-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex gap-4 mb-4">
            <Button className="glass-btn">Simple</Button>
            <Button className="glass-btn">Custom</Button>
          </div>
          <h3 className="text-lg mb-2">Describe your song</h3>
          <textarea
            className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex gap-3 mt-4">
            <Button className="glass-btn">+ Audio</Button>
            <Button className="glass-btn">+ Lyrics</Button>
            <Button className="glass-btn">+ Instrumental</Button>
          </div>
          <div className="mt-6">
            <h4 className="mb-2 text-sm text-gray-400">Inspiration</h4>
            <div className="flex gap-3">
              <Button className="glass-btn">Afro</Button>
              <Button className="glass-btn">Chill</Button>
            </div>
          </div>
          <Button className="mt-8 w-full py-3 bg-gradient-to-r from-pink-500 to-orange-400 rounded-xl text-white font-semibold">
            🎶 Create (20 Credits)
          </Button>
        </motion.div>

        {/* Workspace */}
        <motion.div
          className="p-6 rounded-2xl glass-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">My Workspace</h3>
            <div className="flex items-center gap-2 bg-black/40 rounded-lg px-3 py-1">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                className="bg-transparent outline-none text-sm"
              />
            </div>
          </div>
          <div className="space-y-4">
            {workspaceItems.map((item, idx) => (
              <motion.div
                key={idx}
                className="flex items-center gap-4 p-3 rounded-xl bg-black/30 border border-white/10 hover:bg-purple-600/20 transition cursor-pointer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  {item.duration && (
                    <span className="absolute bottom-1 right-1 text-xs bg-black/70 px-1 rounded">
                      {item.duration}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{item.title}</h4>
                  <div className="flex flex-wrap gap-1 text-xs text-gray-400">
                    {item.tags.map((tag, tIdx) => (
                      <span key={tIdx} className="px-2 py-0.5 bg-white/10 rounded-lg">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Play size={16} />
                  <Heart size={16} />
                  <MoreVertical size={16} />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
