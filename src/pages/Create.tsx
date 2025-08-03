
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MusicGenerationWorkflow } from "@/components/music-generation/MusicGenerationWorkflow";
import { useGenres } from "@/hooks/use-genres";

const Create = () => {
  const [searchParams] = useSearchParams();
  const { genres } = useGenres();
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [initialPrompt, setInitialPrompt] = useState<string>("");

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
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Create Amazing Music</h1>
        <p className="text-muted-foreground">
          Use AI to generate unique songs and instrumentals in any style
        </p>
      </div>

      <Card>
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
    </div>
  );
};

export default Create;
