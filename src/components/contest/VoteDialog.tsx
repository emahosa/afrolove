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

const VOTE_COST = 5;

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
    if (open) setVotes(1);
  }, [open]);

  const cost = useMemo(() => {
    if (votes <= 0) return 0;
    const votesToPay = userHasFreeVote ? Math.max(0, votes - 1) : votes;
    return votesToPay * VOTE_COST;
  }, [votes, userHasFreeVote]);

  const canAfford = cost <= userCredits;

  const handleVoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setVotes(isNaN(value) || value < 1 ? 1 : value);
  };

  const handleSubmit = async () => {
    if (votes < 1) return toast.error('You must cast at least one vote.');
    if (!canAfford) return toast.error("You don't have enough credits for this transaction.");
    await onVoteSubmit(votes);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-surface">
        <DialogHeader>
          <DialogTitle>Vote for "{entryTitle}"</DialogTitle>
          <DialogDescription>
            Enter the number of votes you want to cast.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="votes" className="text-right">
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

          <Alert variant="default" className="bg-white/5 border-white/10 text-white/80">
            <Info className="h-4 w-4" />
            <AlertDescription>
              {userHasFreeVote && <p>Your first vote on this contest is <strong>free</strong>!</p>}
              <p>Additional votes cost <strong>{VOTE_COST} credits</strong> each.</p>
            </AlertDescription>
          </Alert>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Total Votes:</span><span>{votes}</span></div>
            <div className="flex justify-between font-semibold"><span >Credit Cost:</span><span className={!canAfford ? 'text-red-400' : ''}>{cost} credits</span></div>
            <div className="flex justify-between text-white/70"><span>Your Balance:</span><span>{userCredits} credits</span></div>
          </div>
          {!canAfford && <p className="text-center text-red-400 text-sm">You don't have enough credits.</p>}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isVoting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isVoting || !canAfford || votes < 1}>
            {isVoting ? 'Casting Vote...' : `Cast ${votes} Vote${votes > 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
