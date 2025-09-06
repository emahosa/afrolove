import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGenreTemplates } from "@/hooks/use-genre-templates";
import { GenreTemplateCard } from "@/components/dashboard/GenreTemplateCard";

const Dashboard = () => {
  const { user } = useAuth();
  const { templates, loading: templatesLoading } = useGenreTemplates();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="h-full flex flex-col p-4 md:p-8">
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-3xl font-semibold">Welcome back, {user?.user_metadata?.full_name || 'User'}!</h1>
          <p className="text-white/70">Select a genre template to start creating.</p>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto mt-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Genre Templates</h2>
            <p className="text-white/70">Click a card to see the magic.</p>
          </div>

          {templatesLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
            </div>
          ) : (
            <div style={{ perspective: '1200px' }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <GenreTemplateCard
                  key={template.id}
                  template={template}
                  isSelected={selectedId === template.id}
                  onClick={() => setSelectedId(selectedId === template.id ? null : template.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
