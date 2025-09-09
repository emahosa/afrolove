import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MusicGenerationWorkflow } from "@/components/music-generation/MusicGenerationWorkflow";
import { useGenres } from "@/hooks/use-genres";
import SongLibrary from "@/components/music-generation/SongLibrary";
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
  const [searchTerm, setSearchTerm] = useState<string>("");

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
    <div className="flex h-screen bg-zinc-900 text-white overflow-hidden">
      {/* Left Panel: Create Song Form */}
      <div className="w-[35%] p-4 border-r border-gray-700/30 bg-zinc-900 overflow-y-auto scrollbar-hide">
        <MusicGenerationWorkflow
          preSelectedGenre={selectedGenre}
          initialPrompt={initialPrompt}
        />
      </div>

      {/* Middle Panel: Song Library */}
      <div className="flex-1 p-4 border-r border-gray-700/30 bg-black overflow-y-auto scrollbar-hide">
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

      {/* Right Panel: Lyrics Display */}
      <div className="w-[15%] p-4 bg-zinc-950 overflow-y-auto scrollbar-hide">
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
    </div>
  );
};

export default Create;
