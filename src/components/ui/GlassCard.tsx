import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type GlassCardProps = {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
};

export function GlassCard({ children, className, onClick }: GlassCardProps) {
  const [selected, setSelected] = useState(false);

  const handleClick = () => {
    setSelected(!selected);
    if (onClick) {
      onClick();
    }
  };

  return (
    <motion.div
      className={cn("glass-card cursor-pointer", className)}
      onClick={handleClick}
      whileHover={{ scale: 1.03 }}
      animate={selected ? { scale: 1.12, y: -12, z: 60 } : { scale: 1, y: 0, z: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 20 }}
    >
      {children}
    </motion.div>
  );
}
