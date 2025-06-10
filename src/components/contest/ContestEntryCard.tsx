
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, User, Calendar } from "lucide-react";
import { ContestEntry } from "@/hooks/use-contest";
import { PhoneVoteDialog } from "./PhoneVoteDialog";

interface ContestEntryCardProps {
  entry: ContestEntry;
  onVote: (entryId: string, voterPhone?: string) => Promise<boolean>;
  canVote?: boolean;
  isOwnEntry?: boolean;
}

export const ContestEntryCard = ({ entry, onVote, canVote = true, isOwnEntry = false }: ContestEntryCardProps) => {
  const [isVoting, setIsVoting] = useState(false);
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);

  const handleVote = async (phone: string) => {
    setIsVoting(true);
    try {
      const success = await onVote(entry.id, phone);
      if (success) {
        setShowPhoneDialog(false);
      }
      return success;
    } finally {
      setIsVoting(false);
    }
  };

  const getVoteButtonText = () => {
    if (isOwnEntry) return "Your Entry";
    if (!canVote) return "Login to Vote";
    return "Vote";
  };

  const getVoteButtonVariant = () => {
    if (isOwnEntry) return "secondary";
    return "default";
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg line-clamp-2">{entry.description || "Contest Entry"}</CardTitle>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{entry.profiles?.full_name || entry.profiles?.username || "Anonymous"}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{new Date(entry.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            {isOwnEntry && (
              <Badge variant="secondary" className="ml-2">
                Your Entry
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="pb-3">
          {entry.video_url && (
            <div className="aspect-video w-full bg-muted rounded-lg overflow-hidden">
              {entry.media_type === 'video' ? (
                <video 
                  src={entry.video_url} 
                  controls 
                  className="w-full h-full object-cover"
                  preload="metadata"
                />
              ) : (
                <audio 
                  src={entry.video_url} 
                  controls 
                  className="w-full mt-8"
                  preload="metadata"
                />
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between pt-3">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-500" />
            <span className="font-semibold">{entry.vote_count || 0}</span>
            <span className="text-sm text-muted-foreground">
              {entry.vote_count === 1 ? 'vote' : 'votes'}
            </span>
          </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={getVoteButtonVariant()}
              onClick={() => setShowPhoneDialog(true)}
              disabled={isVoting || isOwnEntry || !canVote}
            >
              {isVoting ? "Voting..." : getVoteButtonText()}
            </Button>
          </div>
        </CardFooter>
      </Card>

      <PhoneVoteDialog
        open={showPhoneDialog}
        onOpenChange={setShowPhoneDialog}
        onSubmit={handleVote}
        entryTitle={entry.description || "Contest Entry"}
        artistName={entry.profiles?.full_name || entry.profiles?.username || "Anonymous"}
      />
    </>
  );
};
