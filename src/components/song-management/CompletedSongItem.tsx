
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Play, Download } from "lucide-react";
import { CustomSongRequest } from "@/hooks/use-admin-song-requests";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
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
      
      // Call the onDelete callback immediately to update the parent component
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

  const handleDownloadClick = () => {
    onDownload(request);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className="overflow-hidden bg-gray-900 border-gray-700 hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        {/* Header with song info and actions */}
        <div className="p-4 pb-2 flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate mb-1">{request.title}</h3>
            <p className="text-sm text-gray-400 line-clamp-2">{request.description}</p>
            <p className="text-xs text-gray-500 mt-1">Created: {formatDate(request.created_at)}</p>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePlayClick}
              className="h-8 w-8 rounded-full bg-purple-600/20 hover:bg-purple-600/30 text-purple-400"
            >
              <Play className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadClick}
              disabled={downloadingAudio}
              className="h-8 w-8 rounded-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-400"
            >
              {downloadingAudio ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isDeleting}
                  className="h-8 w-8 rounded-full hover:bg-red-600/20 text-gray-400 hover:text-red-400"
                >
                  {isDeleting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-gray-900 border-gray-700">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Delete Song</AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-400">
                    Are you sure you want to delete "{request.title}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Mini preview section */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <Play className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{request.title}</p>
                <p className="text-xs text-gray-400">AI Generated</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePlayClick}
              className="text-purple-400 border-purple-600 hover:bg-purple-600 hover:text-white"
            >
              Play
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
