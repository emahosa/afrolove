
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Play, Edit, CheckCircle, Clock, Music, User, Calendar } from "lucide-react";
import { CustomSongRequest } from "@/hooks/use-admin-song-requests";
import { toast } from "sonner";

type AdminSongRequestCardProps = {
  request: CustomSongRequest;
  onStartWork: (id: string) => void;
  onUpdateStatus: (id: string, status: CustomSongRequest['status']) => void;
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
}: AdminSongRequestCardProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleMarkCompleted = () => {
    onUpdateStatus(request.id, 'completed');
    toast.success("Request marked as completed");
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
                onClick={() => onUpdateStatus(request.id, 'audio_uploaded')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Music className="h-4 w-4 mr-2" />
                Mark Audio Uploaded
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
