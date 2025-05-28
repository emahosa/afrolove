
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Edit, Save, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CustomSongRequest, CustomSongLyrics } from "@/hooks/use-admin-song-requests";

interface UserLyricsManagerProps {
  request: CustomSongRequest;
  onUpdate: () => void;
  canEdit: boolean;
}

export const UserLyricsManager = ({ request, onUpdate, canEdit }: UserLyricsManagerProps) => {
  const [lyrics, setLyrics] = useState<CustomSongLyrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [editingLyricId, setEditingLyricId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState("");

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
      setProcessing(true);
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
      onUpdate();
    } catch (error: any) {
      console.error('User: Error selecting lyrics:', error);
      toast.error('Failed to select lyrics', {
        description: error.message
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectLyrics = async () => {
    try {
      setProcessing(true);
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
      onUpdate();
    } catch (error: any) {
      console.error('User: Error rejecting lyrics:', error);
      toast.error('Failed to reject lyrics', {
        description: error.message
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleStartEdit = (lyric: CustomSongLyrics) => {
    setEditingLyricId(lyric.id);
    setEditedText(lyric.lyrics);
  };

  const handleSaveEdit = async (lyricsId: string) => {
    try {
      setProcessing(true);

      const { error } = await supabase
        .from('custom_song_lyrics')
        .update({ lyrics: editedText.trim() })
        .eq('id', lyricsId);

      if (error) {
        console.error('User: Error updating lyrics:', error);
        throw error;
      }

      toast.success('Lyrics updated successfully!');
      setEditingLyricId(null);
      setEditedText("");
      fetchLyrics();
    } catch (error: any) {
      console.error('User: Error updating lyrics:', error);
      toast.error('Failed to update lyrics', {
        description: error.message
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingLyricId(null);
    setEditedText("");
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
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">No Lyrics Available</h3>
            <p className="text-muted-foreground">
              {request.status === 'pending' 
                ? "Our team is working on your custom lyrics. You'll be notified when they're ready for review."
                : "No lyrics have been provided for this request yet."
              }
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Lyrics Options for "{request.title}"
          </CardTitle>
          {canEdit && (
            <p className="text-muted-foreground text-sm">
              You can edit, approve, or reject these lyrics. Additional changes may incur extra charges.
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {lyrics.map((lyric) => (
            <div key={lyric.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-medium">
                  Lyrics Option {lyric.version}
                </Label>
                <div className="flex items-center gap-2">
                  {lyric.is_selected && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Selected
                    </Badge>
                  )}
                  {canEdit && !lyric.is_selected && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartEdit(lyric)}
                      disabled={processing || editingLyricId === lyric.id}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
              
              {editingLyricId === lyric.id ? (
                <div className="space-y-3">
                  <Textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="min-h-32 font-mono text-sm"
                    placeholder="Edit the lyrics..."
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(lyric.id)}
                      disabled={processing || !editedText.trim()}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={processing}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-muted/30 rounded-md mb-3">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {lyric.lyrics}
                  </pre>
                </div>
              )}
              
              {!lyric.is_selected && canEdit && editingLyricId !== lyric.id && (
                <Button 
                  onClick={() => handleSelectLyrics(lyric.id)}
                  disabled={processing}
                  className="bg-melody-secondary hover:bg-melody-secondary/90"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {processing ? "Selecting..." : "Approve This Version"}
                </Button>
              )}
            </div>
          ))}
          
          {canEdit && (
            <div className="flex gap-2 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={handleRejectLyrics}
                disabled={processing}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                {processing ? "Processing..." : "Request New Lyrics"}
              </Button>
              <div className="text-xs text-muted-foreground self-center">
                *Additional charges may apply
              </div>
            </div>
          )}
          
          {request.status === 'lyrics_selected' && (
            <div className="text-center text-sm text-muted-foreground pt-4 border-t">
              Lyrics have been selected. Our team will now create your custom song!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
