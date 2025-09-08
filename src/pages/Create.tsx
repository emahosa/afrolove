
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MusicGenerationWorkflow } from "@/components/music-generation/MusicGenerationWorkflow";
import { useGenres } from "@/hooks/use-genres";
import SongLibrary from "@/components/music-generation/SongLibrary";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown } from "lucide-react";

import LyricsDisplay from "@/components/music-generation/LyricsDisplay";

interface Song {
  id: string;
  title: string;
  audio_url: string | null;
  status: string;
  created_at: string;
  genre?: { name: string };
  lyrics?: string;
  prompt?: string;
}


const Create = () => {
  const [searchParams] = useSearchParams();
  const { genres } = useGenres();
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [initialPrompt, setInitialPrompt] = useState<string>("");
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  useEffect(() => {
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8 h-full">
      {/* Create Song Form */}
      <div className="lg:col-span-1">
        <h2 className="text-2xl font-bold mb-4">Create a New Song</h2>
        <MusicGenerationWorkflow
          preSelectedGenre={selectedGenre}
          initialPrompt={initialPrompt}
        />
      </div>

      {/* Completed Songs */}
      <div className="lg:col-span-1 h-full overflow-y-auto">
        <SongLibrary onSongSelect={setSelectedSong} />
      </div>

      {/* Lyrics Display */}
      <div className="lg:col-span-1 h-full overflow-y-auto">
        <LyricsDisplay lyrics={selectedSong?.lyrics || null} />
      </div>
    </div>
  );
};

export default Create;
