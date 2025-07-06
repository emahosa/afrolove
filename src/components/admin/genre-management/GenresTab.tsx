
import { useState } from "react";
import { useGenres, Genre } from "@/hooks/use-genres";
import { Loader2 } from "lucide-react";
import { GenreFormDialog } from "./GenreFormDialog";
import { GenreCard } from "./GenreCard";
import { GenreEmptyState } from "./GenreEmptyState";

export const GenresTab = () => {
  const { genres, loading, createGenre, updateGenre, deleteGenre } = useGenres();
  const [editingGenre, setEditingGenre] = useState<Genre | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  const toggleAudioPreview = (audioUrl: string) => {
    if (playingAudio === audioUrl) {
      setPlayingAudio(null);
    } else {
      setPlayingAudio(audioUrl);
    }
  };

  const handleEdit = (genre: Genre) => {
    setEditingGenre(genre);
  };

  const handleDelete = async (genre: Genre) => {
    if (confirm(`Are you sure you want to delete the "${genre.name}" genre?`)) {
      await deleteGenre(genre.id);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading genres...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Music Genres</h3>
          <p className="text-muted-foreground">Manage base music genres and their configurations</p>
        </div>
        
        <GenreFormDialog
          editingGenre={editingGenre}
          onGenreCreate={createGenre}
          onGenreUpdate={updateGenre}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {genres.map((genre) => (
          <GenreCard
            key={genre.id}
            genre={genre}
            playingAudio={playingAudio}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleAudio={toggleAudioPreview}
          />
        ))}
      </div>

      {genres.length === 0 && <GenreEmptyState />}

      {/* Hidden audio elements for playback */}
      {genres.map((genre) => (
        genre.audio_preview_url && (
          <audio
            key={genre.id}
            src={genre.audio_preview_url}
            onEnded={() => setPlayingAudio(null)}
            onPlay={() => setPlayingAudio(genre.audio_preview_url!)}
            onPause={() => setPlayingAudio(null)}
            ref={(audio) => {
              if (audio) {
                if (playingAudio === genre.audio_preview_url) {
                  audio.play();
                } else {
                  audio.pause();
                }
              }
            }}
          />
        )
      ))}
    </div>
  );
};
