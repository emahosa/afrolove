
import { Music } from "lucide-react";

export const GenreEmptyState = () => {
  return (
    <div className="text-center py-12">
      <Music className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
      <h3 className="text-xl font-semibold mb-2">No genres found</h3>
      <p className="text-muted-foreground mb-4">
        Create your first genre to get started with AI music generation.
      </p>
    </div>
  );
};
