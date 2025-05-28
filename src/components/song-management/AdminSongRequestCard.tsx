
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Play, Edit, CheckCircle, Clock, Music } from "lucide-react";
import { CustomSongRequest } from "@/hooks/use-custom-song-requests";
import { toast } from "sonner";

type AdminSongRequestCardProps = {
  request: CustomSongRequest;
  onStartWork: (id: string) => void;
  onUpdateStatus: (id: string, status: CustomSongRequest['status']) => void;
};

const getStatusBadge = (status: CustomSongRequest['status']) => {
  const statusConfig = {
    pending: { color: "bg-yellow-100 text-yellow-800", label: "Pending", icon: Clock },
    lyrics_uploaded: { color: "bg-blue-100 text-blue-800", label: "Lyrics Ready", icon: Edit },
    instrumental_ready: { color: "bg-purple-100 text-purple-800", label: "Instrumental Ready", icon: Music },
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
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-bold text-lg">Custom Song Request</h3>
                {getStatusBadge(request.status)}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium">User ID:</span> {request.user_id.slice(-8)}
                </div>
                <div>
                  <span className="font-medium">Genre:</span> {request.genre}
                </div>
                <div>
                  <span className="font-medium">Created:</span> {formatDate(request.created_at)}
                </div>
                <div>
                  <span className="font-medium">Updated:</span> {formatDate(request.updated_at)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <Label className="text-sm font-medium">Description</Label>
            <div className="mt-1 p-3 bg-muted/30 rounded-md">
              <p className="text-sm">{request.description}</p>
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
            
            {request.status === "lyrics_uploaded" && (
              <Button variant="outline" disabled>
                <Clock className="h-4 w-4 mr-2" />
                Waiting for User Selection
              </Button>
            )}
            
            {request.status === "instrumental_ready" && (
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
