
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Clock, Music } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CustomSongRequest, CustomSongLyrics } from "@/hooks/use-admin-song-requests";

interface UserLyricsViewerProps {
  request: CustomSongRequest;
  onLyricsSelected: () => void;
}

export const UserLyricsViewer = ({ request, onLyricsSelected }: UserLyricsViewerProps) => {
  const [lyrics, setLyrics] = useState<CustomSongLyrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    fetchLyrics();
  }, [request.id]);

  const fetchLyrics = async () => {
    try {
      setLoading(true);
      console.log('User: Fetching lyrics for request:', request.id);
      
      const { data, error } = await supabase
        .from('custom_song_lyrics')
        .select('*')
        .eq('request_id', request.id)
        .order('version', { ascending: true });

      if (error) {
        console.error('User: Error fetching lyrics:', error);
        toast.error('Failed to load lyrics');
        return;
      }

      console.log('User: Fetched lyrics:', data);
      setLyrics(data || []);
    } catch (error) {
      console.error('User: Error fetching lyrics:', error);
      toast.error('Failed to load lyrics');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLyrics = async (lyricsId: string) => {
    try {
      setSelecting(true);
      console.log('User: Selecting lyrics:', lyricsId);

      // First, unselect all lyrics for this request
      const { error: unselectError } = await supabase
        .from('custom_song_lyrics')
        .update({ is_selected: false })
        .eq('request_id', request.id);

      if (unselectError) {
        console.error('User: Error unselecting lyrics:', unselectError);
        throw unselectError;
      }

      // Then select the chosen lyrics
      const { error: selectError } = await supabase
        .from('custom_song_lyrics')
        .update({ is_selected: true })
        .eq('id', lyricsId);

      if (selectError) {
        console.error('User: Error selecting lyrics:', selectError);
        throw selectError;
      }

      // Update request status to lyrics_selected
      const { error: statusError } = await supabase
        .from('custom_song_requests')
        .update({ status: 'lyrics_selected' })
        .eq('id', request.id);

      if (statusError) {
        console.error('User: Error updating status:', statusError);
        throw statusError;
      }

      toast.success('Lyrics selected successfully!');
      onLyricsSelected();
    } catch (error: any) {
      console.error('User: Error selecting lyrics:', error);
      toast.error('Failed to select lyrics', {
        description: error.message
      });
    } finally {
      setSelecting(false);
    }
  };

  const handleRejectLyrics = async () => {
    try {
      setSelecting(true);
      console.log('User: Rejecting all lyrics for request:', request.id);

      // Update request status back to pending to request new lyrics
      const { error } = await supabase
        .from('custom_song_requests')
        .update({ status: 'pending' })
        .eq('id', request.id);

      if (error) {
        console.error('User: Error rejecting lyrics:', error);
        throw error;
      }

      toast.success('Lyrics rejected. Admin will provide new options.');
      onLyricsSelected();
    } catch (error: any) {
      console.error('User: Error rejecting lyrics:', error);
      toast.error('Failed to reject lyrics', {
        description: error.message
      });
    } finally {
      setSelecting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-melody-primary mr-2"></div>
            <span>Loading lyrics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (lyrics.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">Waiting for Lyrics</h3>
            <p className="text-muted-foreground">
              Our team is working on your custom lyrics. You'll be notified when they're ready for review.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Lyrics Options for "{request.title}"
        </CardTitle>
        <p className="text-muted-foreground">
          Please review the lyrics options below and select your preferred version.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {lyrics.map((lyric) => (
          <div key={lyric.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-medium">
                Lyrics Option {lyric.version}
              </Label>
              {lyric.is_selected && (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Selected
                </Badge>
              )}
            </div>
            
            <div className="p-4 bg-muted/30 rounded-md mb-3">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {lyric.lyrics}
              </pre>
            </div>
            
            {!lyric.is_selected && request.status === 'lyrics_proposed' && (
              <Button 
                onClick={() => handleSelectLyrics(lyric.id)}
                disabled={selecting}
                className="bg-melody-secondary hover:bg-melody-secondary/90"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {selecting ? "Selecting..." : "Select This Version"}
              </Button>
            )}
          </div>
        ))}
        
        {request.status === 'lyrics_proposed' && (
          <div className="flex gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={handleRejectLyrics}
              disabled={selecting}
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              {selecting ? "Processing..." : "Request New Lyrics"}
            </Button>
          </div>
        )}
        
        {request.status === 'lyrics_selected' && (
          <div className="text-center text-sm text-muted-foreground pt-4 border-t">
            Lyrics have been selected. Our team will now create your custom song!
          </div>
        )}
      </CardContent>
    </Card>
  );
};
