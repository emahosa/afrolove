
import { Card, CardContent } from "@/components/ui/card";
import { Disc, Music } from "lucide-react";

interface Track {
  id: string;
  title: string;
  type: "song" | "instrumental";
  genre: string;
  date: string;
}

interface TracksListProps {
  tracks: Track[];
  onTrackSelect: (trackId: string) => void;
}

const TracksList = ({ tracks, onTrackSelect }: TracksListProps) => {
  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Disc className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No tracks found</h3>
        <p className="text-muted-foreground mb-6">
          Create your first track to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tracks.map((track) => (
        <Card 
          key={track.id} 
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => onTrackSelect(track.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-melody-primary/30 flex items-center justify-center rounded-md">
                {track.type === "song" ? (
                  <Music className="h-6 w-6 text-melody-secondary/70" />
                ) : (
                  <Disc className="h-6 w-6 text-melody-secondary/70" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold truncate">{track.title}</h3>
                <p className="text-sm text-muted-foreground">{track.genre} • {track.type}</p>
              </div>
              <span className="text-sm text-muted-foreground">{track.date}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TracksList;
