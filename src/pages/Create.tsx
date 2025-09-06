import React, { useState } from "react";
import { motion } from "framer-motion";
import { Search, Heart, MoreVertical, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

type WorkspaceItem = {
  title: string;
  tags: string[];
  duration?: string;
  image: string;
};

const workspaceItems: WorkspaceItem[] = [
  { title: "Joyous Celebration", tags: ["Afrobeat", "Afropop", "Soulful female"], image: "/placeholder.svg" },
  { title: "Sunset Serenade", tags: ["Amapiano", "Chill", "Instruments"], duration: "3:28", image: "/placeholder.svg" },
  { title: "Heartbeat", tags: ["Afrobeat", "Smooth", "Instruments"], image: "/placeholder.svg" },
  { title: "Dance to the Rhythm", tags: ["Afropop", "Inspirational", "Instruments"], image: "/placeholder.svg" },
  { title: "Afro Blues", tags: ["Afrobeat", "Blues", "Instruments"], image: "/placeholder.svg" },
];

export default function CreatePage() {
  const [description, setDescription] = useState("A vibrant Afrobeat track celebrating the joy of life");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" style={{ perspective: "1000px" }}>
      {/* Song Creator */}
      <motion.div
        className="lg:col-span-2 glass-surface"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex gap-4 mb-4">
          <Button variant="secondary">Simple</Button>
          <Button>Custom</Button>
        </div>
        <h3 className="text-xl font-semibold mb-4">Describe your song</h3>
        <Textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., A vibrant Afrobeat track celebrating the joy of life"
        />
        <div className="flex gap-3 mt-4">
          <Button variant="secondary">+ Audio</Button>
          <Button variant="secondary">+ Lyrics</Button>
          <Button variant="secondary">+ Instrumental</Button>
        </div>
        <div className="mt-6">
          <h4 className="mb-2 text-sm text-white/70">Inspiration</h4>
          <div className="flex gap-3">
            <Button variant="outline">Afro</Button>
            <Button variant="outline">Chill</Button>
          </div>
        </div>
        <Button size="lg" className="mt-8 w-full">
          🎶 Create (20 Credits)
        </Button>
      </motion.div>

      {/* Workspace */}
      <motion.div
        className="glass-surface"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">My Workspace</h3>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
            <Input
              type="text"
              placeholder="Search..."
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-3">
          {workspaceItems.map((item, idx) => (
            <Card
              key={idx}
              className="flex items-center gap-4 p-3 transition-colors hover:bg-white/5 cursor-pointer"
            >
              <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                {item.duration && (
                  <span className="absolute bottom-1 right-1 text-xs bg-black/70 px-1 rounded">
                    {item.duration}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{item.title}</h4>
                <div className="flex flex-wrap gap-1 text-xs text-white/70 mt-1">
                  {item.tags.map((tag, tIdx) => (
                    <span key={tIdx} className="px-1.5 py-0.5 bg-white/10 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 text-white/70">
                <Button variant="ghost" size="icon"><Play size={16} /></Button>
                <Button variant="ghost" size="icon"><Heart size={16} /></Button>
                <Button variant="ghost" size="icon"><MoreVertical size={16} /></Button>
              </div>
            </Card>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
