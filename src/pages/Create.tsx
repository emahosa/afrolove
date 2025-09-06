
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MusicGenerationWorkflow } from "@/components/music-generation/MusicGenerationWorkflow";
import { useGenres } from "@/hooks/use-genres";
import SongLibrary from "@/components/music-generation/SongLibrary";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown } from "lucide-react";

const Create = () => {
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

  return (
    <div className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <div className="space-y-6 glass-surface">
        <Collapsible open={isFormOpen} onOpenChange={setIsFormOpen} className="w-full">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <h2 className="text-xl font-bold">Create a New Song</h2>
              <p className="text-white/70 text-sm">
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

          <CollapsibleContent className="mt-4">
            <MusicGenerationWorkflow
              preSelectedGenre={selectedGenre}
              initialPrompt={initialPrompt}
            />
          </CollapsibleContent>
        </Collapsible>
      </div>
      <div className="lg:mt-0 glass-surface">
        <SongLibrary />
      </div>
    </div>
  );
};

export default Create;
