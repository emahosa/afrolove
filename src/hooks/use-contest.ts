import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface Contest {
  id: string;
  title: string;
  description: string;
  prize: string;
  end_date: string;
  start_date: string;
  entry_fee: number;
  status: 'active' | 'completed' | 'draft' | 'voting';
  rules?: string;
  instrumental_url?: string;
  voting_enabled?: boolean;
  max_entries_per_user?: number;
  created_at: string;
  terms_conditions?: string;
}

export interface ContestEntry {
  id: string;
  contest_id: string;
  user_id: string;
  song_id?: string;
  video_url?: string;
  description?: string;
  approved: boolean;
  vote_count: number;
  media_type: string;
  created_at: string;
  profiles?: {
    full_name?: string;
    username?: string;
  };
}

export const useContest = () => {
  const { user } = useAuth();
  const [activeContests, setActiveContests] = useState<Contest[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [contestEntries, setContestEntries] = useState<ContestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveContests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActiveContests(data || []);
    } catch (err: any) {
      console.error('Error fetching contests:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllContests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContests(data || []);
    } catch (err: any) {
      console.error('Error fetching all contests:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createContest = async (contestData: Partial<Contest>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('contests')
        .insert({
          title: contestData.title || '',
          description: contestData.description || '',
          prize: contestData.prize || '',
          end_date: contestData.end_date || new Date().toISOString(),
          start_date: contestData.start_date || new Date().toISOString(),
          rules: contestData.rules || '',
          status: 'active' as const,
          created_by: user?.id,
          terms_conditions: contestData.terms_conditions || '',
          entry_fee: contestData.entry_fee || 0,
          instrumental_url: contestData.instrumental_url,
          voting_enabled: contestData.voting_enabled,
          max_entries_per_user: contestData.max_entries_per_user
        });

      if (error) throw error;
      
      toast.success('Contest created successfully');
      await fetchAllContests();
      return true;
    } catch (err: any) {
      console.error('Error creating contest:', err);
      toast.error('Failed to create contest: ' + err.message);
      return false;
    }
  };

  const updateContest = async (contestId: string, contestData: Partial<Contest>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('contests')
        .update(contestData)
        .eq('id', contestId);

      if (error) throw error;
      
      toast.success('Contest updated successfully');
      await fetchAllContests();
      return true;
    } catch (err: any) {
      console.error('Error updating contest:', err);
      toast.error('Failed to update contest: ' + err.message);
      return false;
    }
  };

  const deleteContest = async (contestId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('contests')
        .delete()
        .eq('id', contestId);

      if (error) throw error;
      
      toast.success('Contest deleted successfully');
      await fetchAllContests();
      return true;
    } catch (err: any) {
      console.error('Error deleting contest:', err);
      toast.error('Failed to delete contest: ' + err.message);
      return false;
    }
  };

  const refreshContests = async () => {
    await fetchAllContests();
    await fetchActiveContests();
  };

  const fetchContestEntries = async (contestId?: string) => {
    if (!contestId && activeContests.length === 0) return;
    
    const targetContestId = contestId || activeContests[0]?.id;
    if (!targetContestId) return;

    try {
      const { data, error } = await supabase
        .from('contest_entries')
        .select(`
          *,
          profiles:user_id (
            full_name,
            username
          )
        `)
        .eq('contest_id', targetContestId)
        .eq('approved', true)
        .order('vote_count', { ascending: false });

      if (error) throw error;
      
      const transformedEntries = data?.map(entry => ({
        ...entry,
        profiles: Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles
      })) || [];
      
      setContestEntries(transformedEntries);
    } catch (err: any) {
      console.error('Error fetching contest entries:', err);
      setError(err.message);
    }
  };

  const voteForEntry = async (entryId: string): Promise<boolean> => {
    if (!user) {
      toast.error('Please log in to vote');
      return false;
    }

    try {
      console.log('Submitting vote for entry:', entryId);
      
      const entry = contestEntries.find(e => e.id === entryId);
      if (!entry) {
        toast.error('Entry not found');
        return false;
      }

      const { data: existingVote, error: checkError } = await supabase
        .from('contest_votes')
        .select('id')
        .eq('contest_entry_id', entryId)
        .eq('user_id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing vote:', checkError);
        toast.error('Failed to check voting status');
        return false;
      }

      if (existingVote) {
        toast.error('You have already voted for this entry');
        return false;
      }

      const { error: voteError } = await supabase
        .from('contest_votes')
        .insert({
          contest_id: entry.contest_id,
          contest_entry_id: entryId,
          user_id: user.id
        });

      if (voteError) {
        console.error('Error submitting vote:', voteError);
        toast.error('Failed to submit vote: ' + voteError.message);
        return false;
      }

      await fetchContestEntries(entry.contest_id);
      toast.success('Vote submitted successfully!');
      return true;
    } catch (err: any) {
      console.error('Error voting:', err);
      toast.error('Failed to submit vote');
      return false;
    }
  };

  const refreshEntries = () => {
    if (activeContests.length > 0) {
      fetchContestEntries(activeContests[0].id);
    }
  };

  const setCurrentContest = (contest: Contest) => {
    fetchContestEntries(contest.id);
  };

  useEffect(() => {
    fetchActiveContests();
    fetchAllContests();
  }, []);

  useEffect(() => {
    if (activeContests.length > 0) {
      fetchContestEntries(activeContests[0].id);
    }
  }, [activeContests]);

  return {
    activeContests,
    contests,
    contestEntries,
    loading,
    error,
    voteForEntry,
    refreshEntries,
    setCurrentContest,
    createContest,
    updateContest,
    deleteContest,
    refreshContests,
  };
};
