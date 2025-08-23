import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGenreTemplates } from "@/hooks/use-genre-templates";
import { GenreTemplateCard } from "@/components/dashboard/GenreTemplateCard";

const Dashboard = () => {
  const { user } = useAuth();
  const { templates, loading: templatesLoading } = useGenreTemplates();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.user_metadata?.full_name || 'User'}!</h1>
          <p className="text-muted-foreground">Here's what's happening with your music journey</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Available Genres</h2>
          <p className="text-muted-foreground">Choose from these genre templates to create your music</p>
        </div>

        {templatesLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
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
  );
};

export default Dashboard;
