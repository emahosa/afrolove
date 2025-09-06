import React, { useState } from "react";
import { motion } from "framer-motion";
import { Star, Bell, Music, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MotionCard, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const cardVariants = {
    hover: {
      y: -5,
      scale: 1.03,
      transition: { type: "spring", stiffness: 300, damping: 20 },
    },
  };

  const templates = [
    { title: "Afro-RnB Epic", category: "Afro-RnB", image: "/placeholder.svg" },
    { title: "South African Amapiano", category: "Afrobeats", image: "/placeholder.svg" },
    { title: "Sad Afro-RnB", category: "Afrobeats", image: "/placeholder.svg" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">Unleash Your Sound</h1>
          <p className="text-white/70 mt-2">Welcome back, {user?.user_metadata?.name || 'artist'}! Here’s what’s happening in your music journey.</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon"><Bell /></Button>
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold">
            {user?.user_metadata?.name?.charAt(0) || 'A'}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4">
        <Button asChild size="lg"><Link to="/create"><Music className="mr-2" /> Create Song</Link></Button>
        <Button asChild size="lg" variant="secondary"><Link to="/billing"><DollarSign className="mr-2" /> Earn</Link></Button>
      </div>

      {/* Templates Section */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Start with a Template</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" style={{ perspective: "1000px" }}>
          {templates.map((template, idx) => (
            <MotionCard
              key={idx}
              variants={cardVariants}
              whileHover="hover"
              className="overflow-hidden cursor-pointer"
            >
              <img src={template.image} alt={template.title} className="w-full h-48 object-cover" />
              <CardHeader>
                <CardTitle className="text-xl">{template.title}</CardTitle>
                <CardDescription>{template.category}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button size="sm">Preview</Button>
                  <Button size="sm" variant="secondary">Use Template</Button>
                </div>
              </CardContent>
            </MotionCard>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
