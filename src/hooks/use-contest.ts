
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface Contest {
  id: string;
  title: string;
  description: string;
  prize: string;
  start_date: string;
  end_date: string;
  status: string;
  instrumental_url?: string;
  rules: string;
  created_at: string;
  voting_enabled?: boolean;
  max_entries_per_user?: number;
  terms_conditions: string;
}

export interface ContestEntry {
  id: string;
  contest_id: string;
  user_id: string;
  video_url: string;
  description: string;
  approved: boolean;
  vote_count: number;
  media_type: string;
  created_at: string;
}

export const useContest = () => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [contestEntries, setContestEntries] = useState<ContestEntry[]>([]);
  const [userEntries, setUserEntries] = useState<ContestEntry[]>([]);
  const [currentContest, setCurrentContest] = useState<Contest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const { user } = useAuth();

  const fetchContests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContests(data || []);
    } catch (error: any) {
      console.error('Error fetching contests:', error);
      setError(error.message);
      toast.error('Failed to load contests');
    } finally {
      setLoading(false);
    }
  };

  const fetchContestEntries = async (contestId: string) => {
    try {
      const { data, error } = await supabase
        .from('contest_entries')
        .select('*')
        .eq('contest_id', contestId)
        .eq('approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setContestEntries(data || []);
    } catch (error: any) {
      console.error('Error fetching contest entries:', error);
      toast.error('Failed to load contest entries');
    }
  };

  const fetchUserVotes = async (contestId: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('contest_votes')
        .select('contest_entry_id')
        .eq('contest_id', contestId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      const voteSet = new Set(data?.map(vote => vote.contest_entry_id) || []);
      setUserVotes(voteSet);
    } catch (error: any) {
      console.error('Error fetching user votes:', error);
    }
  };

  const createContest = async (contestData: Omit<Contest, 'id' | 'created_at' | 'status'>) => {
    try {
      const { data, error } = await supabase
        .from('contests')
        .insert([{
          title: contestData.title,
          description: contestData.description,
          prize: contestData.prize,
          rules: contestData.rules,
          start_date: contestData.start_date,
          end_date: contestData.end_date,
          instrumental_url: contestData.instrumental_url || '',
          terms_conditions: contestData.terms_conditions,
          status: 'active',
          voting_enabled: contestData.voting_enabled,
          max_entries_per_user: contestData.max_entries_per_user
        }])
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Contest created successfully');
      await fetchContests();
      return true;
    } catch (error: any) {
      console.error('Error creating contest:', error);
      toast.error('Failed to create contest: ' + error.message);
      return false;
    }
  };

  const updateContest = async (contestId: string, contestData: Partial<Contest>) => {
    try {
      const updateData: any = { ...contestData };
      
      if (updateData.status && typeof updateData.status === 'string') {
        const validStatuses = ['draft', 'active', 'voting', 'completed'];
        if (!validStatuses.includes(updateData.status)) {
          updateData.status = 'active';
        }
      }

      const { error } = await supabase
        .from('contests')
        .update(updateData)
        .eq('id', contestId);

      if (error) throw error;
      
      toast.success('Contest updated successfully');
      await fetchContests();
      return true;
    } catch (error: any) {
      console.error('Error updating contest:', error);
      toast.error('Failed to update contest: ' + error.message);
      return false;
    }
  };

  const deleteContest = async (contestId: string) => {
    try {
      const { error } = await supabase
        .from('contests')
        .delete()
        .eq('id', contestId);

      if (error) throw error;
      
      toast.success('Contest deleted successfully');
      await fetchContests();
      return true;
    } catch (error: any) {
      console.error('Error deleting contest:', error);
      toast.error('Failed to delete contest: ' + error.message);
      return false;
    }
  };

  const submitEntry = async (contestId: string, file: File, description: string, title: string) => {
    if (!user) {
      toast.error('You must be logged in to submit an entry');
      return false;
    }

    setSubmitting(true);
    try {
      const videoUrl = URL.createObjectURL(file);
      
      const { error } = await supabase
        .from('contest_entries')
        .insert([{
          contest_id: contestId,
          user_id: user.id,
          video_url: videoUrl,
          description: title,
          media_type: file.type.startsWith('video/') ? 'video' : 'audio',
          approved: false,
          vote_count: 0
        }]);

      if (error) throw error;
      
      toast.success('Entry submitted successfully! It will be reviewed before appearing in the contest.');
      return true;
    } catch (error: any) {
      console.error('Error submitting entry:', error);
      toast.error('Failed to submit entry: ' + error.message);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const voteForEntry = async (entryId: string, voterPhone?: string) => {
    if (!user || !currentContest) {
      toast.error('You must be logged in to vote');
      return false;
    }

    if (userVotes.has(entryId)) {
      toast.error('You have already voted for this entry');
      return false;
    }

    try {
      const { error } = await supabase
        .from('contest_votes')
        .insert([{
          contest_id: currentContest.id,
          contest_entry_id: entryId,
          user_id: user.id,
          voter_phone: voterPhone
        }]);

      if (error) throw error;
      
      setUserVotes(prev => new Set([...prev, entryId]));
      await fetchContestEntries(currentContest.id);
      
      toast.success('Vote cast successfully!');
      return true;
    } catch (error: any) {
      console.error('Error voting:', error);
      toast.error('Failed to cast vote: ' + error.message);
      return false;
    }
  };

  const hasUserEntry = (contestId: string) => {
    return userEntries.some(entry => entry.contest_id === contestId);
  };

  const downloadInstrumental = (url: string, title: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}_instrumental.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const refreshContests = () => {
    fetchContests();
  };

  useEffect(() => {
    fetchContests();
  }, []);

  useEffect(() => {
    if (currentContest && user) {
      fetchContestEntries(currentContest.id);
      fetchUserVotes(currentContest.id);
    }
  }, [currentContest, user]);

  return {
    contests,
    activeContests: contests.filter(c => c.status === 'active'),
    contestEntries,
    userEntries,
    currentContest,
    loading,
    error,
    userVotes,
    submitting,
    createContest,
    updateContest,
    deleteContest,
    submitEntry,
    voteForEntry,
    hasUserEntry,
    downloadInstrumental,
    refreshContests,
    setCurrentContest,
    fetchContestEntries,
    fetchUserVotes
  };
};
