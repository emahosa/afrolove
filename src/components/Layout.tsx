// src/components/Layout.tsx
import React from "react";
import { Music } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: React.ReactNode;
  active?: string;
}

export default function Layout({ children, active }: LayoutProps) {
  const menuItems = ["Home", "Create", "Library", "Contest", "Profile", "Billing", "Support"];

  return (
    <div className="flex h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-black/40 backdrop-blur-lg border-r border-white/10 flex flex-col p-4">
        <div className="flex items-center space-x-2 mb-6">
          <Music className="text-purple-400" />
          <h1 className="text-xl font-bold">Afroverse</h1>
        </div>
        <nav className="flex flex-col space-y-4 text-gray-300">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              className={`text-left px-3 py-2 rounded-lg transition ${
                item === active
                  ? "bg-purple-600/40 text-white"
                  : "hover:bg-purple-500/20"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="mt-auto">
          <div className="flex items-center space-x-2 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-sm">
              a
            </div>
            <span className="text-sm">afro@sabex</span>
          </div>
          <Button className="glass-btn w-full mt-3">Upgrade</Button>
          <p className="text-sm text-gray-400 mt-2">20 Credits</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
