
import { useState, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MusicGenerationWorkflow } from "@/components/music-generation/MusicGenerationWorkflow";
import { useGenres } from "@/hooks/use-genres";
import SongLibrary from "@/components/music-generation/SongLibrary";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown } from "lucide-react";

const Create = () => {
  const [searchParams] = useSearchParams();
  const { state } = useLocation();
  const { genres } = useGenres();
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [initialPrompt, setInitialPrompt] = useState<string>("");
  const [adminPrompt, setAdminPrompt] = useState<string>("");
  const [templateName, setTemplateName] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState(true);

  useEffect(() => {
    // Check for data passed via navigation state first
    if (state) {
      setSelectedGenre(state.selectedGenre || "");
      setInitialPrompt(state.initialPrompt || "");
      setAdminPrompt(state.adminPrompt || "");
      setTemplateName(state.templateName || "");
    } else {
      // Fallback to URL params
      const genreId = searchParams.get('genre');
      const promptParam = searchParams.get('prompt');

      if (genreId) {
        setSelectedGenre(genreId);
      }

      if (promptParam) {
        setInitialPrompt(promptParam);
      }
    }
  }, [searchParams, state]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div className="space-y-6">
        <Collapsible open={isFormOpen} onOpenChange={setIsFormOpen} className="w-full">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="text-left">
              <h2 className="text-xl font-bold">{templateName ? `New Song from Template: ${templateName}` : 'Create a New Song'}</h2>
              <p className="text-muted-foreground text-sm">
                Use AI to generate music in any style
              </p>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                <ChevronsUpDown className="h-4 w-4" />
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            <Card className="mt-4">
              <CardContent className="pt-6">
                <MusicGenerationWorkflow
                  preSelectedGenre={selectedGenre}
                  initialPrompt={initialPrompt}
                  adminPrompt={adminPrompt}
                />
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>
      <div className="lg:mt-0">
        <SongLibrary />
      </div>
    </div>
  );
};

export default Create;
