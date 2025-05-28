
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Download, Music, Eye, EyeOff, Trash2 } from "lucide-react";
import { CustomSongRequest } from "@/hooks/use-admin-song-requests";
import { useState } from "react";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CompletedSongItemProps {
  request: CustomSongRequest;
  onPlay: (request: CustomSongRequest) => void;
  onDownload: (request: CustomSongRequest) => void;
  onDelete?: (requestId: string) => void;
  downloadingAudio: boolean;
}

export const CompletedSongItem = ({ 
  request, 
  onPlay, 
  onDownload, 
  onDelete,
  downloadingAudio 
}: CompletedSongItemProps) => {
  const [showLyrics, setShowLyrics] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { handlePlay } = useAudioPlayer();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handlePlayClick = () => {
    handlePlay({ id: request.id, title: request.title });
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    try {
      setIsDeleting(true);
      console.log('Deleting song request:', request.id);

      // Delete related records first
      await supabase.from('custom_song_audio').delete().eq('request_id', request.id);
      await supabase.from('custom_song_lyrics').delete().eq('request_id', request.id);
      
      // Delete the main request
      const { error } = await supabase
        .from('custom_song_requests')
        .delete()
        .eq('id', request.id);

      if (error) {
        console.error('Error deleting song request:', error);
        toast.error('Failed to delete song: ' + error.message);
        return;
      }

      toast.success('Song deleted successfully');
      onDelete(request.id);
    } catch (error: any) {
      console.error('Error deleting song:', error);
      toast.error('Failed to delete song: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start gap-4">
          {/* Cover Art */}
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-melody-primary to-melody-secondary flex items-center justify-center flex-shrink-0">
            <Music className="h-8 w-8 text-white" />
          </div>

          {/* Song Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold mb-1 truncate">{request.title}</h3>
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
              {request.description}
            </p>
            <p className="text-xs text-muted-foreground">
              Completed on {formatDate(request.updated_at)}
            </p>
          </div>

          {/* Lyrics Preview */}
          {showLyrics && (
            <div className="flex-1 max-w-md bg-muted/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Lyrics</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLyrics(false)}
                  className="h-6 w-6 p-0"
                >
                  <EyeOff className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground max-h-20 overflow-y-auto">
                {/* This would be populated with actual lyrics from the database */}
                <p className="whitespace-pre-line">
                  Lyrics will be displayed here when available...
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {!showLyrics && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLyrics(true)}
                className="h-9 px-3"
              >
                <Eye className="h-4 w-4 mr-2" />
                Lyrics
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handlePlayClick}
              className="h-9 px-3"
            >
              <Play className="h-4 w-4 mr-2" />
              Play
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(request)}
              disabled={downloadingAudio}
              className="h-9 px-3"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="h-9 px-3 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
            >
              {isDeleting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-destructive border-t-transparent" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
