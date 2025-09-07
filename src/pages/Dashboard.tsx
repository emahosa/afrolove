import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGenreTemplates } from "@/hooks/use-genre-templates";
import { GenreTemplateCard } from "@/components/dashboard/GenreTemplateCard";
import HeroSection from "@/components/dashboard/HeroSection";

const Dashboard = () => {
  const { user } = useAuth();
  const { templates, loading: templatesLoading } = useGenreTemplates();

  return (
    <div className="h-full flex flex-col">
      <HeroSection />
      <div className="p-4 md:p-8">
        <div className="flex justify-between items-center flex-shrink-0">
          <div>
            <h1 className="text-3xl font-semibold text-white">Welcome back, {user?.user_metadata?.full_name || 'User'}!</h1>
            <p className="text-gray-400">Here's what's happening with your music journey</p>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto mt-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold text-white">Available Genres</h2>
              <p className="text-gray-400">Choose from these genre templates to create your music</p>
            </div>

            {templatesLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-dark-purple"></div>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                  <GenreTemplateCard key={template.id} template={template} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
