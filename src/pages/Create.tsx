import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { MusicGenerationWorkflow } from "@/components/music-generation/MusicGenerationWorkflow";
import { useGenres } from "@/hooks/use-genres";
import { useIsMobile } from "@/hooks/use-mobile";
import SongLibrary from "@/components/music-generation/SongLibrary";
import LyricsDisplay from "@/components/music-generation/LyricsDisplay";
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
} from "@/components/ui/resizable";

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
  const isMobile = useIsMobile();
  const location = useLocation();
  const { genres } = useGenres();
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [initialPrompt, setInitialPrompt] = useState<string>("");
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    const state = location.state as { selectedGenre?: string; initialPrompt?: string };
    if (state?.selectedGenre) {
      setSelectedGenre(state.selectedGenre);
    }
    if (state?.initialPrompt) {
      setInitialPrompt(state.initialPrompt);
    }
  }, [location.state]);

  if (isMobile) {
    return (
      <div className="h-full p-4 bg-black overflow-y-auto no-scrollbar">
        <MusicGenerationWorkflow
          preSelectedGenre={selectedGenre}
          initialPrompt={initialPrompt}
        />
      </div>
    );
  }

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="flex-1 bg-black text-white"
    >
      {/* Left Panel: Create Song Form */}
      <ResizablePanel defaultSize={35}>
        <div className="h-full p-4 bg-black overflow-y-auto no-scrollbar">
          <MusicGenerationWorkflow
            preSelectedGenre={selectedGenre}
            initialPrompt={initialPrompt}
          />
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />

      {/* Middle Panel: Song Library */}
      <ResizablePanel defaultSize={50}>
        <div className="h-full p-4 bg-black overflow-y-auto no-scrollbar">
          <div className="pb-4">
              <h2 className="text-xl font-semibold text-white mb-4">My Workspace</h2>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-white placeholder-zinc-500"
                />
              </div>
          </div>
          <SongLibrary onSongSelect={setSelectedSong} searchTerm={searchTerm} />
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />

      {/* Right Panel: Lyrics Display */}
      <ResizablePanel defaultSize={15}>
        <div className="h-full p-4 bg-black overflow-y-auto no-scrollbar">
          {selectedSong ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Lyrics - {selectedSong.title}</h3>
                  <button
                      onClick={() => setSelectedSong(null)}
                      className="text-zinc-500 hover:text-white"
                  >
                      &times;
                  </button>
              </div>
              <LyricsDisplay lyrics={selectedSong?.lyrics || null} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-zinc-500">Select a song to view lyrics.</p>
            </div>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default Create;
