
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Music, Calendar, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserSongRequests } from "@/hooks/use-user-song-requests";
import { UserLyricsViewer } from "@/components/song-management/UserLyricsViewer";

const UserCustomSongs = () => {
  const { userRequests, loading, error, refetch } = useUserSongRequests();

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", label: "In Queue", icon: Clock },
      lyrics_proposed: { color: "bg-blue-100 text-blue-800", label: "Review Lyrics", icon: Music },
      lyrics_selected: { color: "bg-purple-100 text-purple-800", label: "Creating Song", icon: Music },
      audio_uploaded: { color: "bg-orange-100 text-orange-800", label: "Song Ready", icon: Music },
      completed: { color: "bg-green-100 text-green-800", label: "Completed", icon: Music }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
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

  const handleRefresh = () => {
    console.log('UserCustomSongs: Manual refresh triggered');
    refetch();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-melody-primary"></div>
        <span className="ml-2">Loading your custom songs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Custom Songs</h1>
          <p className="text-muted-foreground mt-2">
            Track the progress of your custom song requests and review proposed lyrics.
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/15 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive font-semibold">Error loading requests:</p>
          <p className="text-destructive/80">{error}</p>
        </div>
      )}

      {userRequests.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Music className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Custom Songs Yet</h3>
            <p className="text-muted-foreground">
              You haven't submitted any custom song requests yet. Visit the Create page to request your first custom song!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {userRequests.map((request) => (
            <Card key={request.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{request.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {request.description}
                    </CardDescription>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Requested: {formatDate(request.created_at)}</span>
                  </div>
                  {request.updated_at !== request.created_at && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Updated: {formatDate(request.updated_at)}</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                {request.status === 'pending' && (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <h4 className="font-semibold mb-2">Your Request is in Queue</h4>
                    <p className="text-muted-foreground">
                      Our team will start working on your custom lyrics soon. You'll be notified when they're ready for review.
                    </p>
                  </div>
                )}
                
                {(request.status === 'lyrics_proposed' || request.status === 'lyrics_selected') && (
                  <UserLyricsViewer 
                    request={request} 
                    onLyricsSelected={() => refetch()} 
                  />
                )}
                
                {request.status === 'audio_uploaded' && (
                  <div className="text-center py-8">
                    <Music className="h-12 w-12 text-green-600 mx-auto mb-3" />
                    <h4 className="font-semibold mb-2">Your Song is Ready!</h4>
                    <p className="text-muted-foreground">
                      Your custom song has been created and is ready for download.
                    </p>
                  </div>
                )}
                
                {request.status === 'completed' && (
                  <div className="text-center py-8">
                    <Music className="h-12 w-12 text-green-600 mx-auto mb-3" />
                    <h4 className="font-semibold mb-2">Song Completed!</h4>
                    <p className="text-muted-foreground">
                      Your custom song request has been completed. Thank you for using our service!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserCustomSongs;
