import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useContestSubmission } from '@/hooks/useContestSubmission';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useGenreTemplates, GenreTemplate } from '@/hooks/use-genre-templates';
import { Contest } from '@/hooks/use-contest';

interface Song {
  id: string;
  title: string;
}

interface SubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contest: Contest;
  onSubmissionSuccess: () => void;
}

export const SubmissionDialog = ({ open, onOpenChange, contest, onSubmissionSuccess }: SubmissionDialogProps) => {
  const { user } = useAuth();
  const { submitEntry, isSubmitting } = useContestSubmission();
  const { templates: genreTemplates, loading: templatesLoading } = useGenreTemplates();
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSong, setSelectedSong] = useState<string>('');
  const [selectedGenreTemplate, setSelectedGenreTemplate] = useState<string>('');
  const [description, setDescription] = useState('');
  const [socialLink, setSocialLink] = useState('');

  useEffect(() => {
    if (user && open && contest.submission_type === 'library') {
      fetchUserSongs();
    }
  }, [user, open, contest.submission_type]);

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
    if (contest.submission_type === 'library' && !selectedSong) {
      toast.error('Please select a song to submit.');
      return;
    }
    if (contest.submission_type === 'genre_template' && !selectedGenreTemplate) {
      toast.error('Please select a genre template to submit.');
      return;
    }

    try {
      await submitEntry({
        contestId: contest.id,
        songId: selectedSong,
        genreTemplateId: selectedGenreTemplate,
        description,
        socialLink,
      });
      onSubmissionSuccess();
      onOpenChange(false);
    } catch (error) {
      // Error toast is handled in the hook
    }
  };

  const isSubmitDisabled = () => {
    if (isSubmitting) return true;
    if (contest.submission_type === 'library') {
      return !selectedSong;
    }
    if (contest.submission_type === 'genre_template') {
      return !selectedGenreTemplate;
    }
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-gray-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Submit to {contest.title}</DialogTitle>
          <DialogDescription className="text-gray-400">
            {contest.submission_type === 'library'
              ? 'Choose one of your songs to enter the contest.'
              : 'Choose a genre template to create your entry.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {contest.submission_type === 'library' ? (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="song" className="text-right text-gray-300">
                Song
              </Label>
              <Select value={selectedSong} onValueChange={setSelectedSong}>
                <SelectTrigger className="col-span-3 bg-black/20 border-white/20">
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
          ) : (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="genre-template" className="text-right text-gray-300">
                Genre
              </Label>
              <Select value={selectedGenreTemplate} onValueChange={setSelectedGenreTemplate}>
                <SelectTrigger className="col-span-3 bg-black/20 border-white/20">
                  <SelectValue placeholder="Select a genre template" />
                </SelectTrigger>
                <SelectContent>
                  {templatesLoading ? (
                     <SelectItem value="loading" disabled>Loading templates...</SelectItem>
                  ) : genreTemplates.length > 0 ? (
                    genreTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.template_name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-templates" disabled>
                      No genre templates available.
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
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
          {contest.social_link_enabled && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="social-link" className="text-right text-gray-300">
                Social Link
              </Label>
              <Input
                id="social-link"
                value={socialLink}
                onChange={(e) => setSocialLink(e.target.value)}
                className="col-span-3 bg-black/20 border-white/20"
                placeholder="e.g., soundcloud.com/artist"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="bg-transparent border-white/30 hover:bg-white/10">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitDisabled()} className="bg-dark-purple hover:bg-opacity-90 font-bold">
            {isSubmitting ? 'Submitting...' : 'Submit Entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubmissionDialog;
