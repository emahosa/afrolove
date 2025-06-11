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
  credit_cost: number;
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
  profiles?: {
    id: string;
    full_name?: string;
    username?: string;
  } | null;
}

export const useContest = () => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [contestEntries, setContestEntries] = useState<ContestEntry[]>([]);
  const [userEntries, setUserEntries] = useState<ContestEntry[]>([]);
  const [currentContest, setCurrentContest] = useState<Contest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const [unlockedContests, setUnlockedContests] = useState<Set<string>>(new Set());
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
        .select(`
          *,
          profiles (
            id,
            full_name,
            username
          )
        `)
        .eq('contest_id', contestId)
        .eq('approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface with proper null handling
      const transformedEntries = (data || []).map(entry => {
        const profilesData = entry.profiles;
        
        // Check if profiles exists and is a valid object with an id
        if (profilesData && typeof profilesData === 'object' && 'id' in profilesData) {
          return {
            ...entry,
            profiles: {
              id: profilesData.id,
              full_name: profilesData.full_name || undefined,
              username: profilesData.username || undefined
            }
          };
        }
        
        return {
          ...entry,
          profiles: null
        };
      });
      
      setContestEntries(transformedEntries);
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
          credit_cost: contestData.credit_cost,
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
      // Ensure we have the required fields for update
      const updateData: any = { ...contestData };
      
      // Convert status to proper enum type if provided
      if (updateData.status && typeof updateData.status === 'string') {
        const validStatuses = ['draft', 'active', 'voting', 'completed'];
        if (!validStatuses.includes(updateData.status)) {
          updateData.status = 'active'; // Default fallback
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
      // In a real app, you'd upload the file to storage first
      // For now, we'll use a placeholder URL
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

    // Check if user has already voted in this contest
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
      
      // Update local state
      setUserVotes(prev => new Set([...prev, entryId]));
      
      // Refresh entries to get updated vote counts
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

  const unlockContest = async (contestId: string, creditCost: number) => {
    if (!user) {
      toast.error('You must be logged in to unlock a contest');
      return false;
    }

    try {
      // Check if user has enough credits
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile || profile.credits < creditCost) {
        toast.error(`You need ${creditCost} credits to unlock this contest`);
        return false;
      }

      // Deduct credits
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ credits: profile.credits - creditCost })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Add to unlocked contests
      setUnlockedContests(prev => new Set([...prev, contestId]));

      toast.success(`Contest unlocked! ${creditCost} credits deducted.`);
      return true;
    } catch (error: any) {
      console.error('Error unlocking contest:', error);
      toast.error('Failed to unlock contest: ' + error.message);
      return false;
    }
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
    unlockedContests,
    submitting,
    createContest,
    updateContest,
    deleteContest,
    submitEntry,
    voteForEntry,
    hasUserEntry,
    unlockContest,
    downloadInstrumental,
    refreshContests,
    setCurrentContest,
    fetchContestEntries,
    fetchUserVotes
  };
};
