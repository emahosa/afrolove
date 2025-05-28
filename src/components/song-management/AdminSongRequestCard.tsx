
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Play, Edit, CheckCircle, Clock, Music, User, Calendar, Upload, Copy } from "lucide-react";
import { CustomSongRequest, CustomSongLyrics } from "@/hooks/use-admin-song-requests";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type AdminSongRequestCardProps = {
  request: CustomSongRequest;
  onStartWork: (id: string) => void;
  onUpdateStatus: (id: string, status: CustomSongRequest['status']) => void;
  fetchSelectedLyrics: (requestId: string) => Promise<CustomSongLyrics | null>;
};

const getStatusBadge = (status: CustomSongRequest['status']) => {
  const statusConfig = {
    pending: { color: "bg-yellow-100 text-yellow-800", label: "Pending", icon: Clock },
    lyrics_proposed: { color: "bg-blue-100 text-blue-800", label: "Lyrics Proposed", icon: Edit },
    lyrics_selected: { color: "bg-purple-100 text-purple-800", label: "Lyrics Selected", icon: Music },
    audio_uploaded: { color: "bg-orange-100 text-orange-800", label: "Audio Uploaded", icon: Music },
    completed: { color: "bg-green-100 text-green-800", label: "Completed", icon: CheckCircle }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

export const AdminSongRequestCard = ({
  request,
  onStartWork,
  onUpdateStatus,
  fetchSelectedLyrics,
}: AdminSongRequestCardProps) => {
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [selectedLyrics, setSelectedLyrics] = useState<CustomSongLyrics | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);

  useEffect(() => {
    if (request.status === 'lyrics_selected' || request.status === 'audio_uploaded' || request.status === 'completed') {
      loadSelectedLyrics();
    }
  }, [request.status, request.id]);

  const loadSelectedLyrics = async () => {
    setLoadingLyrics(true);
    try {
      const lyrics = await fetchSelectedLyrics(request.id);
      setSelectedLyrics(lyrics);
    } catch (error) {
      console.error('Error loading selected lyrics:', error);
    } finally {
      setLoadingLyrics(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCopyLyrics = async () => {
    if (selectedLyrics?.lyrics) {
      try {
        await navigator.clipboard.writeText(selectedLyrics.lyrics);
        toast.success('Lyrics copied to clipboard');
      } catch (error) {
        console.error('Error copying lyrics:', error);
        toast.error('Failed to copy lyrics');
      }
    }
  };

  const handleMarkCompleted = () => {
    onUpdateStatus(request.id, 'completed');
    toast.success("Request marked as completed");
  };

  const handleAudioUpload = async () => {
    if (!audioFile) {
      toast.error("Please select an audio file first");
      return;
    }

    setUploadingAudio(true);
    try {
      console.log('Admin: Uploading audio file for request:', request.id);
      
      // Create unique filename
      const fileExt = audioFile.name.split('.').pop();
      const fileName = `${request.id}_final.${fileExt}`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('custom-songs')
        .upload(`audio/${fileName}`, audioFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Error uploading audio:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('custom-songs')
        .getPublicUrl(`audio/${fileName}`);

      console.log('Audio uploaded successfully, URL:', publicUrl);

      // Save audio record to database
      const { error: dbError } = await supabase
        .from('custom_song_audio')
        .insert({
          request_id: request.id,
          audio_url: publicUrl,
          version: 1,
          is_selected: true
        });

      if (dbError) {
        console.error('Error saving audio record:', dbError);
        throw dbError;
      }

      // Update request status
      await onUpdateStatus(request.id, 'audio_uploaded');
      setAudioFile(null);
      toast.success("Audio uploaded successfully!");
      
    } catch (error: any) {
      console.error('Error in audio upload:', error);
      toast.error("Failed to upload audio", {
        description: error.message
      });
    } finally {
      setUploadingAudio(false);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="font-bold text-lg">{request.title}</h3>
                {getStatusBadge(request.status)}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="font-medium">User ID:</span>
                  <code className="bg-muted px-1 rounded text-xs">{request.user_id.slice(-8)}</code>
                </div>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Music className="h-4 w-4" />
                  <span className="font-medium">Genre ID:</span>
                  <code className="bg-muted px-1 rounded text-xs">
                    {request.genre_id ? request.genre_id.slice(-8) : 'Not specified'}
                  </code>
                </div>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Created:</span>
                  <span>{formatDate(request.created_at)}</span>
                </div>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Updated:</span>
                  <span>{formatDate(request.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <Label className="text-sm font-medium mb-2 block">Description</Label>
            <div className="p-3 bg-muted/30 rounded-md">
              <p className="text-sm whitespace-pre-wrap">{request.description}</p>
            </div>
          </div>

          {/* Selected lyrics section with improved color palette */}
          {(request.status === 'lyrics_selected' || request.status === 'audio_uploaded' || request.status === 'completed') && (
            <div className="mb-4">
              <Label className="text-sm font-medium mb-2 block">Selected Lyrics by User</Label>
              {loadingLyrics ? (
                <div className="p-3 bg-muted/30 rounded-md">
                  <p className="text-sm text-muted-foreground">Loading selected lyrics...</p>
                </div>
              ) : selectedLyrics ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md">
                  <div className="flex justify-between items-start mb-2">
                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
                      Version {selectedLyrics.version} - Selected
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyLyrics}
                      className="flex items-center gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </Button>
                  </div>
                  <pre className="text-sm whitespace-pre-wrap font-mono text-emerald-900 leading-relaxed">{selectedLyrics.lyrics}</pre>
                </div>
              ) : (
                <div className="p-3 bg-muted/30 rounded-md">
                  <p className="text-sm text-muted-foreground">No lyrics selected yet</p>
                </div>
              )}
            </div>
          )}

          {/* Audio upload section for lyrics_selected status */}
          {request.status === "lyrics_selected" && (
            <div className="mb-4 p-4 border border-dashed border-border rounded-md">
              <Label className="text-sm font-medium mb-2 block">Upload Final Audio</Label>
              <div className="space-y-3">
                <Input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  className="file:mr-2 file:rounded file:border-0 file:bg-melody-primary file:text-white file:px-2 file:py-1"
                />
                {audioFile && (
                  <div className="text-sm text-muted-foreground">
                    Selected: {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-2 mt-4">
            {request.status === "pending" && (
              <Button 
                onClick={() => onStartWork(request.id)}
                className="bg-melody-secondary hover:bg-melody-secondary/90"
              >
                <Edit className="h-4 w-4 mr-2" />
                Start Working on Lyrics
              </Button>
            )}
            
            {request.status === "lyrics_proposed" && (
              <Button variant="outline" disabled>
                <Clock className="h-4 w-4 mr-2" />
                Waiting for User Selection
              </Button>
            )}
            
            {request.status === "lyrics_selected" && (
              <Button 
                onClick={handleAudioUpload}
                disabled={!audioFile || uploadingAudio}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadingAudio ? "Uploading..." : "Upload Audio"}
              </Button>
            )}
            
            {request.status === "audio_uploaded" && (
              <Button 
                onClick={handleMarkCompleted}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Completed
              </Button>
            )}
            
            {request.status === "completed" && (
              <Button variant="outline" disabled>
                <CheckCircle className="h-4 w-4 mr-2" />
                Completed
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
