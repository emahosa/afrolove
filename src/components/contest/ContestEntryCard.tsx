
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, ThumbsUp, User, Pause, Link } from 'lucide-react';
import { ContestEntry } from '@/hooks/use-contest';
import { useAuth } from '@/contexts/AuthContext';
import { PhoneVoteDialog } from './PhoneVoteDialog';

interface ContestEntryCardProps {
  entry: ContestEntry;
  onVote: (entryId: string, voterPhone?: string) => Promise<boolean>;
  onPlay?: (entryId: string, videoUrl: string) => void;
  isPlaying?: boolean;
  userHasVoted?: boolean;
}

export const ContestEntryCard = ({ entry, onVote, onPlay, isPlaying, userHasVoted }: ContestEntryCardProps) => {
  const { user } = useAuth();
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [voting, setVoting] = useState(false);

  const handleVoteClick = async () => {
    if (user) {
      setVoting(true);
      await onVote(entry.id);
      setVoting(false);
    } else {
      setShowPhoneDialog(true);
    }
  };

  const handlePhoneVote = async (phone: string) => {
    setVoting(true);
    const success = await onVote(entry.id, phone);
    setVoting(false);
    return success;
  };

  const handlePlayClick = () => {
    if (onPlay && entry.video_url) {
      onPlay(entry.id, entry.video_url);
    }
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <CardContent className="p-0">
          <div className="relative aspect-video bg-gradient-to-br from-melody-primary/20 to-melody-secondary/20 flex items-center justify-center">
            {/* Media thumbnail/preview */}
            <div className="text-center">
              <div className="w-16 h-16 bg-melody-primary/30 rounded-full flex items-center justify-center mb-2">
                {entry.media_type === 'video' ? (
                  <Play className="h-8 w-8 text-melody-primary" />
                ) : (
                  <User className="h-8 w-8 text-melody-primary" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {entry.media_type === 'video' ? 'Video Entry' : 'Audio Entry'}
              </p>
            </div>
            
            {/* Play button */}
            {entry.video_url && onPlay && (
              <Button 
                variant="secondary" 
                size="icon" 
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/70 hover:bg-melody-secondary"
                onClick={handlePlayClick}
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6" />
                )}
              </Button>
            )}
          </div>
          
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold truncate">{entry.description || 'Untitled Entry'}</h3>
              <Badge variant="secondary">
                {entry.vote_count} votes
              </Badge>
            </div>
            
            <div className="text-sm text-muted-foreground mb-3">
              by {entry.profiles?.full_name || entry.profiles?.username || 'Anonymous'}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-muted-foreground">
                <ThumbsUp className="h-4 w-4 mr-1" />
                <span>{entry.vote_count}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                {entry.social_link && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(entry.social_link, '_blank')}
                  >
                    <Link className="h-4 w-4 mr-1" />
                    View
                  </Button>
                )}
                <Button
                  variant={userHasVoted ? "outline" : "default"}
                  size="sm"
                  className={userHasVoted ? "opacity-50 cursor-not-allowed" : ""}
                  onClick={handleVoteClick}
                  disabled={userHasVoted || voting}
                >
                  {voting ? 'Voting...' : userHasVoted ? 'Voted' : 'Vote'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <PhoneVoteDialog
        open={showPhoneDialog}
        onOpenChange={setShowPhoneDialog}
        onVoteSubmit={handlePhoneVote}
        entryTitle={entry.description || 'Entry'}
      />
    </>
  );
};
