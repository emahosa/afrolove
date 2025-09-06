import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useContestSubmission } from '@/hooks/useContestSubmission';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Song {
  id: string;
  title: string;
}

interface SubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contestId: string;
  onSubmissionSuccess: () => void;
}

export const SubmissionDialog = ({ open, onOpenChange, contestId, onSubmissionSuccess }: SubmissionDialogProps) => {
  const { user } = useAuth();
  const { submitEntry, isSubmitting } = useContestSubmission();
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSong, setSelectedSong] = useState<string>('');
  const [description, setDescription] = useState('');

  const fetchUserSongs = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('songs')
        .select('id, title')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSongs(data || []);
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error('Failed to load your songs: ' + error.message);
      } else {
        toast.error('An unknown error occurred while fetching songs.');
      }
    }
  }, [user]);

  useEffect(() => {
    if (user && open) {
      fetchUserSongs();
    }
  }, [user, open, fetchUserSongs]);

  const handleSubmit = async () => {
    if (!selectedSong) {
      toast.error('Please select a song to submit.');
      return;
    }
    try {
      await submitEntry({
        contestId,
        songId: selectedSong,
        description,
      });
      onSubmissionSuccess();
      onOpenChange(false);
    } catch (error) {
      // Error toast is handled in the hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Submit to Contest</DialogTitle>
          <DialogDescription className="text-white/70">
            Choose a song and add a description for your entry.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="song" className="text-right text-white/80">
              Song
            </Label>
            <Select value={selectedSong} onValueChange={setSelectedSong}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a song" />
              </SelectTrigger>
              <SelectContent>
                {songs.length > 0 ? (
                  songs.map((song) => (
                    <SelectItem key={song.id} value={song.id}>
                      {song.title}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-songs" disabled>
                    No completed songs found.
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right text-white/80">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
              placeholder="Tell us about your entry (optional)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedSong}>
            {isSubmitting ? 'Submitting...' : 'Submit Entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubmissionDialog;
