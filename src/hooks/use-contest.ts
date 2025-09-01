
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Contest {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  prize: string;
  rules: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  voting_enabled: boolean;
  created_by: string;
  status: string;
  instrumental_url?: string;
  entry_fee?: number;
  max_entries_per_user?: number;
}

export interface ContestEntry {
  id: string;
  contest_id: string;
  user_id: string;
  song_id: string | null;
  video_url: string | null;
  description: string | null;
  vote_count: number;
  status: 'pending' | 'approved' | 'rejected';
  approved: boolean;
  created_at: string;
  updated_at: string;
  media_type: 'audio' | 'video';
  user?: {
    id: string;
    full_name: string | null;
    username: string | null;
  };
  song?: {
    id: string;
    title: string;
    artist: string;
    audio_url: string;
    cover_image_url: string;
  } | null;
}

export const useContest = () => {
  const { user } = useAuth();
  const [contests, setContests] = useState<Contest[]>([]);
  const [activeContest, setActiveContest] = useState<Contest | null>(null);
  const [entries, setEntries] = useState<ContestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [votedEntries, setVotedEntries] = useState<string[]>([]);

  const fetchContests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contests:', error);
        setError(error.message);
      } else {
        // Map database fields to interface
        const mappedContests = data?.map(contest => ({
          ...contest,
          is_active: contest.status === 'active',
          voting_enabled: contest.status === 'active'
        })) || [];
        setContests(mappedContests);
      }
    } catch (error: any) {
      console.error('Error in fetchContests:', error);
      setError(error.message || 'Failed to load contests');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchContest = useCallback(async (contestId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .eq('id', contestId)
        .single();

      if (error) {
        console.error('Error fetching contest:', error);
        setError(error.message);
      } else {
        const mappedContest = {
          ...data,
          is_active: data.status === 'active',
          voting_enabled: data.status === 'active'
        };
        setActiveContest(mappedContest);
      }
    } catch (error: any) {
      console.error('Error in fetchContest:', error);
      setError(error.message || 'Failed to load contest');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchContestEntries = useCallback(async (contestId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('contest_entries')
        .select(`
          *,
          user:profiles (
            id,
            full_name,
            username
          ),
          song:songs (
            id,
            title,
            artist,
            audio_url,
            cover_image_url
          )
        `)
        .eq('contest_id', contestId)
        .eq('approved', true)
        .order('vote_count', { ascending: false });

      if (error) {
        console.error('Error fetching contest entries:', error);
        setError(error.message);
      } else {
        setEntries(data || []);
      }
    } catch (error: any) {
      console.error('Error in fetchContestEntries:', error);
      setError(error.message || 'Failed to load contest entries');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserVotes = useCallback(async (contestId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('contest_votes')
        .select('contest_entry_id')
        .eq('user_id', user.id)
        .eq('contest_id', contestId);

      if (error) {
        console.error('Error fetching user votes:', error);
      } else {
        const votedEntryIds = data?.map(vote => vote.contest_entry_id) || [];
        setVotedEntries(votedEntryIds);
      }
    } catch (error: any) {
      console.error('Error in fetchUserVotes:', error);
    }
  }, [user]);

  const handleVote = async (contestId: string, entryId: string) => {
    if (!user) {
      toast.error('Please log in to vote');
      return false;
    }

    if (votedEntries.includes(entryId)) {
      toast.error('You have already voted for this entry');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('cast_vote', {
        entry_id: entryId,
        p_contest_id: contestId,
        p_num_votes: 1
      });

      if (error) {
        console.error('Error voting for entry:', error);
        setError(error.message);
        toast.error('Failed to vote. Please try again.');
        return false;
      }

      // Type assertion for the response data
      const response = data as { success: boolean; message: string };
      
      if (response.success) {
        // Optimistically update the vote count
        setEntries(prevEntries =>
          prevEntries.map(entry =>
            entry.id === entryId ? { ...entry, vote_count: entry.vote_count + 1 } : entry
          )
        );

        // Update the voted entries
        setVotedEntries(prevVoted => [...prevVoted, entryId]);

        toast.success('Vote submitted successfully');
        return true;
      } else {
        toast.error(response.message);
        return false;
      }
    } catch (error: any) {
      console.error('Error in handleVote:', error);
      setError(error.message || 'Failed to submit vote');
      toast.error('Failed to vote. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const submitEntry = async (contestId: string, songId?: string, description?: string) => {
    if (!user) {
      toast.error('Please log in to submit an entry');
      return false;
    }

    try {
      setSubmitting(true);
      const { data, error } = await supabase.rpc('submit_contest_entry', {
        p_contest_id: contestId,
        p_song_id: songId,
        p_description: description || ''
      });

      if (error) throw error;

      // Type assertion for the response data
      const response = data as { success: boolean; message: string };
      
      if (response.success) {
        toast.success(response.message);
        await fetchContestEntries(contestId);
        return true;
      } else {
        toast.error(response.message);
        return false;
      }
    } catch (error: any) {
      console.error('Error submitting entry:', error);
      toast.error(error.message || 'Failed to submit entry');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const createContest = async (contestData: {
    title: string;
    description: string;
    prize: string;
    rules?: string;
    start_date: string;
    end_date: string;
    instrumental_url?: string;
    entry_fee?: number;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('contests')
        .insert([{
          title: contestData.title,
          description: contestData.description,
          prize: contestData.prize,
          rules: contestData.rules,
          start_date: contestData.start_date,
          end_date: contestData.end_date,
          instrumental_url: contestData.instrumental_url,
          entry_fee: contestData.entry_fee || 0,
          status: 'active',
          created_by: user?.id || ''
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating contest:', error);
        setError(error.message);
        toast.error('Failed to create contest');
        return false;
      }

      const mappedContest = {
        ...data,
        is_active: data.status === 'active',
        voting_enabled: data.status === 'active'
      };
      setContests(prev => [mappedContest, ...prev]);
      toast.success('Contest created successfully');
      return true;
    } catch (error: any) {
      console.error('Error in createContest:', error);
      setError(error.message || 'Failed to create contest');
      toast.error('Failed to create contest');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateContest = async (contestId: string, contestData: {
    title: string;
    description: string;
    prize: string;
    rules?: string;
    start_date: string;
    end_date: string;
    instrumental_url?: string;
    entry_fee?: number;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('contests')
        .update({
          title: contestData.title,
          description: contestData.description,
          prize: contestData.prize,
          rules: contestData.rules,
          start_date: contestData.start_date,
          end_date: contestData.end_date,
          instrumental_url: contestData.instrumental_url,
          entry_fee: contestData.entry_fee || 0
        })
        .eq('id', contestId)
        .select()
        .single();

      if (error) {
        console.error('Error updating contest:', error);
        setError(error.message);
        toast.error('Failed to update contest');
        return false;
      }

      const mappedContest = {
        ...data,
        is_active: data.status === 'active',
        voting_enabled: data.status === 'active'
      };

      setContests(prev => prev.map(contest => 
        contest.id === contestId ? mappedContest : contest
      ));
      
      if (activeContest?.id === contestId) {
        setActiveContest(mappedContest);
      }

      toast.success('Contest updated successfully');
      return true;
    } catch (error: any) {
      console.error('Error in updateContest:', error);
      setError(error.message || 'Failed to update contest');
      toast.error('Failed to update contest');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteContest = async (contestId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('contests')
        .delete()
        .eq('id', contestId);

      if (error) {
        console.error('Error deleting contest:', error);
        setError(error.message);
        toast.error('Failed to delete contest');
        return false;
      }

      setContests(prev => prev.filter(contest => contest.id !== contestId));
      
      if (activeContest?.id === contestId) {
        setActiveContest(null);
      }

      toast.success('Contest deleted successfully');
      return true;
    } catch (error: any) {
      console.error('Error in deleteContest:', error);
      setError(error.message || 'Failed to delete contest');
      toast.error('Failed to delete contest');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const refreshContests = () => {
    fetchContests();
  };

  const refetchContestEntries = (contestId: string) => {
    fetchContestEntries(contestId);
  };

  useEffect(() => {
    fetchContests();
  }, [fetchContests]);

  return {
    contests,
    activeContest,
    entries,
    loading,
    submitting,
    error,
    votedEntries,
    fetchContest,
    fetchContestEntries,
    fetchUserVotes,
    handleVote,
    submitEntry,
    createContest,
    updateContest,
    deleteContest,
    refreshContests,
    refetchContestEntries,
    setActiveContest
  };
};
