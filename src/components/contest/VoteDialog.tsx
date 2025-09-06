import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface VoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVoteSubmit: (votes: number) => Promise<void>;
  entryTitle: string;
  userHasFreeVote: boolean;
  userCredits: number;
  isVoting: boolean;
}

const VOTE_COST = 5; // 5 credits per vote after the free one

export const VoteDialog = ({
  open,
  onOpenChange,
  onVoteSubmit,
  entryTitle,
  userHasFreeVote,
  userCredits,
  isVoting,
}: VoteDialogProps) => {
  const [votes, setVotes] = useState(1);

  useEffect(() => {
    // Reset to 1 vote when the dialog is opened
    if (open) {
      setVotes(1);
    }
  }, [open]);

  const cost = useMemo(() => {
    if (votes <= 0) return 0;
    const votesToPay = userHasFreeVote ? Math.max(0, votes - 1) : votes;
    return votesToPay * VOTE_COST;
  }, [votes, userHasFreeVote]);

  const canAfford = cost <= userCredits;

  const handleVoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (isNaN(value) || value < 1) {
      setVotes(1);
    } else {
      setVotes(value);
    }
  };

  const handleSubmit = async () => {
    if (votes < 1) {
      toast.error('You must cast at least one vote.');
      return;
    }
    if (!canAfford) {
      toast.error("You don't have enough credits for this transaction.");
      return;
    }
    await onVoteSubmit(votes);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Vote for "{entryTitle}"</DialogTitle>
          <DialogDescription className="text-white/70">
            Enter the number of votes you want to cast.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="votes" className="text-right text-white/80">
              Votes
            </Label>
            <Input
              id="votes"
              type="number"
              value={votes}
              onChange={handleVoteChange}
              className="col-span-3"
              min="1"
            />
          </div>

          <Alert className="bg-black/20 border-white/10 text-white/80">
            <Info className="h-4 w-4 text-white/80" />
            <AlertDescription>
              {userHasFreeVote && (
                <p>
                  Your first vote on this contest is <strong>free</strong>!
                </p>
              )}
              <p>
                Additional votes cost <strong>{VOTE_COST} credits</strong> each.
              </p>
            </AlertDescription>
          </Alert>

          <div className="space-y-1 text-sm text-white/80">
            <div className="flex justify-between">
              <span>Total Votes:</span>
              <span>{votes}</span>
            </div>
            <div className="flex justify-between font-semibold text-white">
              <span>Credit Cost:</span>
              <span className={!canAfford ? 'text-red-500' : ''}>
                {cost} credits
              </span>
            </div>
            <div className="flex justify-between text-white/70">
              <span>Your Balance:</span>
              <span>{userCredits} credits</span>
            </div>
          </div>
          {!canAfford && (
            <p className="text-center text-red-500 text-sm">
              You don't have enough credits.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isVoting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isVoting || !canAfford || votes < 1}>
            {isVoting ? 'Casting Vote...' : `Cast ${votes} Vote${votes > 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
