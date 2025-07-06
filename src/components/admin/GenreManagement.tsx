
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GenreTemplateManagement } from "./GenreTemplateManagement";
import { GenresTab } from "./genre-management/GenresTab";

export const GenreManagement = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Genre Management</h2>
        <p className="text-muted-foreground">Manage music genres and genre templates</p>
      </div>

      <Tabs defaultValue="genres" className="space-y-4">
        <TabsList>
          <TabsTrigger value="genres">Genres</TabsTrigger>
          <TabsTrigger value="templates">Genre Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="genres">
          <GenresTab />
        </TabsContent>

        <TabsContent value="templates">
          <GenreTemplateManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GenreManagement;
