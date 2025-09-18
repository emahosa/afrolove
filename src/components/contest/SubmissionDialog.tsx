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

interface Contest {
  id: string;
  submission_type: 'user_library' | 'genre_template';
  social_link_enabled: boolean;
}

interface GenreTemplate {
  id: string;
  template_name: string;
}

export const SubmissionDialog = ({ open, onOpenChange, contestId, onSubmissionSuccess }: SubmissionDialogProps) => {
  const { user } = useAuth();
  const { submitEntry, isSubmitting } = useContestSubmission();
  const [songs, setSongs] = useState<Song[]>([]);
  const [genreTemplates, setGenreTemplates] = useState<GenreTemplate[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [description, setDescription] = useState('');
  const [socialLink, setSocialLink] = useState('');
  const [contest, setContest] = useState<Contest | null>(null);

  useEffect(() => {
    const fetchContestDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('contests')
          .select('id, submission_type, social_link_enabled')
          .eq('id', contestId)
          .single();
        if (error) throw error;
        setContest(data);
      } catch (error) {
        const e = error as Error;
        console.error('Error fetching contest details:', e);
        toast.error('Failed to load contest details.');
        onOpenChange(false);
      }
    };

    if (user && open) {
      fetchContestDetails();
    }
  }, [user, open, contestId, onOpenChange]);

  useEffect(() => {
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
      } catch (error) {
        const e = error as Error;
        console.error('Error fetching songs:', e);
        toast.error('Failed to load your songs.');
      }
    };

    const fetchGenreTemplates = async () => {
      try {
        const { data, error } = await supabase
          .from('genre_templates')
          .select('id, template_name')
          .eq('is_active', true);
        if (error) throw error;
        setGenreTemplates(data || []);
      } catch (error) {
        const e = error as Error;
        console.error('Error fetching genre templates:', e);
        toast.error('Failed to load genre templates.');
      }
    };

    if (contest) {
      if (contest.submission_type === 'user_library') {
        fetchUserSongs();
      } else {
        fetchGenreTemplates();
      }
    }
  }, [contest, user]);

  const fetchContestDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('contests')
        .select('id, submission_type, social_link_enabled')
        .eq('id', contestId)
        .single();
      if (error) throw error;
      setContest(data);
    } catch (error) {
      console.error('Error fetching contest details:', error);
      toast.error('Failed to load contest details.');
      onOpenChange(false);
    }
  };

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

  const fetchGenreTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('genre_templates')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      setGenreTemplates(data || []);
    } catch (error) {
      console.error('Error fetching genre templates:', error);
      toast.error('Failed to load genre templates.');
    }
  };

  const handleSubmit = async () => {
    if (!selectedItem) {
      toast.error('Please select an item to submit.');
      return;
    }
    try {
      await submitEntry({
        contestId,
        songId: selectedItem,
        description,
        socialLink: socialLink,
      });
      onSubmissionSuccess();
      onOpenChange(false);
    } catch (error) {
      const e = error as Error;
      toast.error(e.message || 'An unexpected error occurred.');
    }
  };

  const renderSubmissionSource = () => {
    if (!contest) return null;

    if (contest.submission_type === 'user_library') {
      return (
        <Select value={selectedItem} onValueChange={setSelectedItem}>
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
      );
    }

    if (contest.submission_type === 'genre_template') {
      return (
        <Select value={selectedItem} onValueChange={setSelectedItem}>
          <SelectTrigger className="col-span-3 bg-black/20 border-white/20">
            <SelectValue placeholder="Select a genre template" />
          </SelectTrigger>
          <SelectContent>
            {genreTemplates.length > 0 ? (
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
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-gray-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Submit to Contest</DialogTitle>
          <DialogDescription className="text-gray-400">
            Choose an item and add a description for your entry.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="item" className="text-right text-gray-300">
              {contest?.submission_type === 'user_library' ? 'Song' : 'Template'}
            </Label>
            {renderSubmissionSource()}
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
          {contest?.social_link_enabled && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="social-link" className="text-right text-gray-300">
                Social Link
              </Label>
              <Input
                id="social-link"
                value={socialLink}
                onChange={(e) => setSocialLink(e.target.value)}
                className="col-span-3 bg-black/20 border-white/20"
                placeholder="https://soundcloud.com/your-track"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="bg-transparent border-white/30 hover:bg-white/10">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedItem} className="bg-dark-purple hover:bg-opacity-90 font-bold">
            {isSubmitting ? 'Submitting...' : 'Submit Entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubmissionDialog;
