
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { MusicGenerationWorkflow } from "@/components/music-generation/MusicGenerationWorkflow";
import { useGenres } from "@/hooks/use-genres";
import SongLibrary from "@/components/music-generation/SongLibrary";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Music } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Create = () => {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const { genres } = useGenres();
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [initialPrompt, setInitialPrompt] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState(true);

  useEffect(() => {
    // Check for pre-selected genre from URL params
    const genreId = searchParams.get('genre');
    const promptParam = searchParams.get('prompt');

    if (genreId) {
      setSelectedGenre(genreId);
    }

    if (promptParam) {
      setInitialPrompt(promptParam);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Music className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Welcome to Song Creation</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Please log in to start creating amazing music with AI
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-6">
            <Collapsible open={isFormOpen} onOpenChange={setIsFormOpen} className="w-full">
              <div className="flex items-center justify-between p-6 border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow">
                <div className="text-left">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Music className="h-6 w-6 text-primary" />
                    Create a New Song
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Use AI to generate music in any style
                  </p>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="hover:bg-muted">
                    <ChevronsUpDown className="h-4 w-4" />
                    <span className="sr-only">Toggle</span>
                  </Button>
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent>
                <Card className="mt-4 shadow-lg">
                  <CardContent className="pt-6">
                    <MusicGenerationWorkflow
                      preSelectedGenre={selectedGenre}
                      initialPrompt={initialPrompt}
                    />
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </div>
          
          <div className="lg:mt-0">
            <div className="sticky top-4">
              <SongLibrary />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Create;
