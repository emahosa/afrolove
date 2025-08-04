
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Collapsible open={isFormOpen} onOpenChange={setIsFormOpen}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-center">
                <h1 className="text-3xl font-bold">Create Amazing Music</h1>
                <p className="text-muted-foreground">
                  Use AI to generate unique songs and instrumentals in any style
                </p>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  <ChevronsUpDown className="h-4 w-4" />
                  <span className="sr-only">Toggle</span>
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          <CollapsibleContent>
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>AI Music Generation</CardTitle>
                <CardDescription>
                  Describe the music you want to create and let AI bring it to life
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MusicGenerationWorkflow
                  preSelectedGenre={selectedGenre}
                  initialPrompt={initialPrompt}
                />
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>
      <div>
        <SongLibrary />
      </div>
    </div>
  );
};

export default Create;
