import React, { createContext, useContext, useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";

interface VoiceProfile {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  credits: number;
  subscription?: string;
  avatar?: string;
  isAdmin?: boolean;
  voiceProfiles?: VoiceProfile[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUserCredits: (amount: number) => void;
  updateUserVoiceProfile: (profileId: string, profileName: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Mock user data for demo purposes
const MOCK_USER = {
  id: "user-123",
  name: "Demo User",
  email: "demo@example.com",
  credits: 5,
  subscription: "free",
  avatar: "/placeholder.svg",
  isAdmin: false,
  voiceProfiles: []
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored user in localStorage
    const storedUser = localStorage.getItem("melody-user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      if (email && password) { // Basic validation
        setUser(MOCK_USER);
        localStorage.setItem("melody-user", JSON.stringify(MOCK_USER));
        toast({ title: "Login successful", description: "Welcome back!" });
        return true;
      }
      toast({ 
        title: "Login failed", 
        description: "Invalid email or password", 
        variant: "destructive"
      });
      return false;
    } catch (error) {
      toast({ 
        title: "Login error", 
        description: "An unexpected error occurred", 
        variant: "destructive" 
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      if (name && email && password) { // Basic validation
        const newUser = { ...MOCK_USER, name, email };
        setUser(newUser);
        localStorage.setItem("melody-user", JSON.stringify(newUser));
        toast({ title: "Registration successful", description: "Welcome to MelodyVerse!" });
        return true;
      }
      toast({ 
        title: "Registration failed", 
        description: "Please fill in all required fields", 
        variant: "destructive" 
      });
      return false;
    } catch (error) {
      toast({ 
        title: "Registration error", 
        description: "An unexpected error occurred", 
        variant: "destructive" 
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("melody-user");
    toast({ title: "Logged out", description: "You have been successfully logged out" });
  };

  const updateUserCredits = (amount: number) => {
    if (user) {
      const updatedUser = {
        ...user,
        credits: user.credits + amount
      };
      setUser(updatedUser);
      localStorage.setItem("melody-user", JSON.stringify(updatedUser));
    }
  };

  const updateUserVoiceProfile = (profileId: string, profileName: string) => {
    if (user) {
      const voiceProfiles = user.voiceProfiles || [];
      const updatedProfiles = [...voiceProfiles, { id: profileId, name: profileName }];
      
      const updatedUser = {
        ...user,
        voiceProfiles: updatedProfiles
      };
      
      setUser(updatedUser);
      localStorage.setItem("melody-user", JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      login, 
      register, 
      logout, 
      updateUserCredits, 
      updateUserVoiceProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
