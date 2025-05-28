
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Play } from "lucide-react";
import { CustomSongRequest } from "@/hooks/use-admin-song-requests";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { SoundCloudPlayer } from "./SoundCloudPlayer";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CompletedSongItemProps {
  request: CustomSongRequest;
  onPlay: (request: CustomSongRequest) => void;
  onDownload: (request: CustomSongRequest) => void;
  onDelete: (requestId: string) => void;
  downloadingAudio: boolean;
}

export const CompletedSongItem = ({ 
  request, 
  onPlay, 
  onDownload, 
  onDelete,
  downloadingAudio 
}: CompletedSongItemProps) => {
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const { handlePlay } = useAudioPlayer();

  const handleDelete = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to delete songs');
      return;
    }

    try {
      setIsDeleting(true);
      console.log('CompletedSongItem: Starting deletion for request:', request.id);

      // Delete the custom song request
      const { error: deleteError } = await supabase
        .from('custom_song_requests')
        .delete()
        .eq('id', request.id)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('CompletedSongItem: Error deleting request:', deleteError);
        toast.error('Failed to delete song: ' + deleteError.message);
        return;
      }

      console.log('CompletedSongItem: Successfully deleted request:', request.id);
      toast.success('Song deleted successfully');
      
      // Call the onDelete callback to update the parent component
      onDelete(request.id);
      
    } catch (error: any) {
      console.error('CompletedSongItem: Unexpected error during deletion:', error);
      toast.error('Failed to delete song: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePlayClick = () => {
    handlePlay({ id: request.id, title: request.title });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className="overflow-hidden bg-white border-gray-200 hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        {/* Header with song info and actions */}
        <div className="p-4 pb-2 flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate mb-1">{request.title}</h3>
            <p className="text-sm text-gray-500 line-clamp-2">{request.description}</p>
            <p className="text-xs text-gray-400 mt-1">Created: {formatDate(request.created_at)}</p>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePlayClick}
              className="h-8 w-8 rounded-full bg-orange-100 hover:bg-orange-200 text-orange-600"
            >
              <Play className="h-4 w-4" />
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isDeleting}
                  className="h-8 w-8 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Song</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{request.title}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* SoundCloud-style player */}
        <div className="px-4 pb-4">
          <SoundCloudPlayer
            requestId={request.id}
            title={request.title}
            isDownloadable={true}
            onDownload={() => onDownload(request)}
            downloadingAudio={downloadingAudio}
            artist="AI Generated"
          />
        </div>
      </CardContent>
    </Card>
  );
};
