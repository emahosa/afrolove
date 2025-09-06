import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (user && open) {
      fetchUserSongs();
    }
  }, [user, open]);

  const fetchUserSongs = async () => {
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
    } catch (error: any) {
      console.error('Error fetching songs:', error);
      toast.error('Failed to load your songs.');
    }
  };

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
      <DialogContent className="sm:max-w-[425px] bg-gray-800/40 backdrop-blur-xl border-purple-500/20 text-white">
        <DialogHeader>
          <DialogTitle>Submit to Contest</DialogTitle>
          <DialogDescription className="text-gray-400">
            Choose a song and add a description for your entry.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="song" className="text-right text-gray-300">
              Song
            </Label>
            <Select value={selectedSong} onValueChange={setSelectedSong}>
              <SelectTrigger className="col-span-3 bg-black/20 border-white/20">
                <SelectValue placeholder="Select a song" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/20 text-white">
                {songs.length > 0 ? (
                  songs.map((song) => (
                    <SelectItem key={song.id} value={song.id} className="focus:bg-purple-500/50">
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
            <Label htmlFor="description" className="text-right text-gray-300">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3 bg-black/20 border-white/20"
              placeholder="Tell us about your entry (optional)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="glass" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="bg-red-500/10 hover:bg-red-500/20 text-red-400">
            Cancel
          </Button>
          <Button variant="glass" onClick={handleSubmit} disabled={isSubmitting || !selectedSong}>
            {isSubmitting ? 'Submitting...' : 'Submit Entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubmissionDialog;
