
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
  const [searchTerm, setSearchTerm] = useState("");

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
    <div className="flex h-[calc(100vh-theme(spacing.16))] bg-background">
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Create Song Form - Left side, smaller */}
        <div className="w-1/3 p-6 border-r border-border overflow-y-auto">
          <MusicGenerationWorkflow
            preSelectedGenre={selectedGenre}
            initialPrompt={initialPrompt}
          />
        </div>

        {/* Right Sidebar - My Workspace, larger */}
        <div className="w-2/3 bg-card p-6 flex flex-col">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">My Workspace</h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Search"
                className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-sm text-foreground placeholder-muted-foreground"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SongLibrary onSongSelect={setSelectedSong} searchTerm={searchTerm} />
          </div>
        </div>
      </div>

      {/* Lyrics Display Modal/Overlay - Only show when song is selected */}
      {selectedSong && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Lyrics - {selectedSong.title}</h3>
              <button 
                onClick={() => setSelectedSong(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>
            <LyricsDisplay lyrics={selectedSong?.lyrics || null} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Create;
