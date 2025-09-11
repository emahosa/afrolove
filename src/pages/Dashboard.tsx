import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGenreTemplates } from "@/hooks/use-genre-templates";
import { GenreTemplateCard } from "@/components/dashboard/GenreTemplateCard";
import HeroSection from "@/components/dashboard/HeroSection";
import WinnerSlider from "@/components/dashboard/WinnerSlider";

const Dashboard = () => {
  const { user } = useAuth();
  const { templates, loading: templatesLoading } = useGenreTemplates();

  return (
    <div className="h-full flex flex-col">
      <HeroSection />
      <WinnerSlider />
      <div className="p-4 md:p-8">
        <div className="flex justify-between items-center flex-shrink-0">
          <div>
            <h1 className="text-2xl font-semibold text-white">Browse Templates</h1>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto mt-6">
          <div className="space-y-4">
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
