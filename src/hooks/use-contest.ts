
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Contest {
  id: string;
  title: string;
  description: string;
  rules: string;
  prize: string;
  prize_amount: number;
  prize_currency: string;
  start_date: string;
  end_date: string;
  status: string;
  instrumental_url: string;
  terms_conditions: string;
  created_at: string;
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
    full_name: string;
    username: string;
  };
}

export const useContest = () => {
  const { user } = useAuth();
  const [contests, setContests] = useState<Contest[]>([]);
  const [currentContest, setCurrentContest] = useState<Contest | null>(null);
  const [contestEntries, setContestEntries] = useState<ContestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch active contests
  const fetchContests = async () => {
    try {
      console.log('Fetching contests from useContest hook...');
      setError(null);
      
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contests:', error);
        throw error;
      }
      
      console.log('Contests fetched successfully:', data);
      setContests(data || []);
      
      // Set the first active contest as current
      if (data && data.length > 0) {
        setCurrentContest(data[0]);
        console.log('Set current contest:', data[0]);
      } else {
        console.log('No active contests found');
        setCurrentContest(null);
      }
    } catch (error: any) {
      console.error('Error in fetchContests:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      setError(errorMessage);
      toast.error('Failed to load contests: ' + errorMessage);
    }
  };

  // Fetch entries for current contest
  const fetchContestEntries = async (contestId: string) => {
    if (!contestId) {
      console.log('No contest ID provided for fetching entries');
      setContestEntries([]);
      return;
    }

    try {
      console.log('Fetching contest entries for contest:', contestId);
      setError(null);
      
      // Get contest entries with profiles in a single query using JOIN
      const { data: entriesData, error: entriesError } = await supabase
        .from('contest_entries')
        .select(`
          *,
          profiles!inner(
            full_name,
            username
          )
        `)
        .eq('contest_id', contestId)
        .eq('approved', true)
        .order('vote_count', { ascending: false });

      if (entriesError) {
        console.error('Error fetching entries:', entriesError);
        throw entriesError;
      }

      console.log('Contest entries with profiles fetched:', entriesData);
      setContestEntries(entriesData || []);
    } catch (error: any) {
      console.error('Error fetching contest entries:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      setError(errorMessage);
      toast.error('Failed to load contest entries: ' + errorMessage);
      setContestEntries([]);
    }
  };

  // Submit contest entry
  const submitEntry = async (contestId: string, videoFile: File, description: string, title: string) => {
    if (!user) {
      toast.error('Please log in to submit an entry');
      return false;
    }

    setSubmitting(true);
    try {
      console.log('Submitting contest entry...');
      
      // For now, we'll just store the file name as video_url
      // In a real implementation, you'd upload to Supabase Storage
      const videoUrl = `uploads/${user.id}/${videoFile.name}`;

      const { error } = await supabase
        .from('contest_entries')
        .insert({
          contest_id: contestId,
          user_id: user.id,
          video_url: videoUrl,
          description,
          media_type: videoFile.type.startsWith('video/') ? 'video' : 'audio',
          approved: false // Pending admin approval
        });

      if (error) {
        console.error('Error submitting entry:', error);
        throw error;
      }

      toast.success('Entry submitted successfully! It will be reviewed by our team.');
      return true;
    } catch (error: any) {
      console.error('Error submitting entry:', error);
      toast.error(error.message || 'Failed to submit entry');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Vote for an entry
  const voteForEntry = async (entryId: string, voterPhone?: string) => {
    try {
      console.log('Submitting vote for entry:', entryId);
      
      const voteData: any = {
        entry_id: entryId,
        voter_phone: voterPhone || 'anonymous'
      };

      const { error } = await supabase
        .from('votes')
        .insert(voteData);

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast.error('You have already voted for this entry');
        } else {
          console.error('Vote error:', error);
          throw error;
        }
        return false;
      }

      toast.success('Vote submitted successfully!');
      // Refresh entries to get updated vote counts
      if (currentContest) {
        fetchContestEntries(currentContest.id);
      }
      return true;
    } catch (error: any) {
      console.error('Error voting:', error);
      toast.error(error.message || 'Failed to submit vote');
      return false;
    }
  };

  // Download instrumental
  const downloadInstrumental = (instrumentalUrl: string, contestTitle: string) => {
    try {
      const link = document.createElement('a');
      link.href = instrumentalUrl;
      link.download = `${contestTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_instrumental.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Downloading instrumental...');
    } catch (error) {
      console.error('Error downloading instrumental:', error);
      toast.error('Failed to download instrumental');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      console.log('Loading contest data...');
      setLoading(true);
      await fetchContests();
      setLoading(false);
    };

    loadData();
  }, []);

  useEffect(() => {
    if (currentContest) {
      console.log('Current contest changed, fetching entries for:', currentContest.id);
      fetchContestEntries(currentContest.id);
    }
  }, [currentContest]);

  return {
    contests,
    currentContest,
    contestEntries,
    loading,
    submitting,
    error,
    submitEntry,
    voteForEntry,
    downloadInstrumental,
    refreshEntries: () => currentContest && fetchContestEntries(currentContest.id),
    refreshContests: fetchContests
  };
};
