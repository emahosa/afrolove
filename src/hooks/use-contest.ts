
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

  // Fetch active contests
  const fetchContests = async () => {
    try {
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContests(data || []);
      
      // Set the first active contest as current
      if (data && data.length > 0) {
        setCurrentContest(data[0]);
      }
    } catch (error) {
      console.error('Error fetching contests:', error);
      toast.error('Failed to load contests');
    }
  };

  // Fetch entries for current contest
  const fetchContestEntries = async (contestId: string) => {
    try {
      const { data, error } = await supabase
        .from('contest_entries')
        .select(`
          *,
          profiles(full_name, username)
        `)
        .eq('contest_id', contestId)
        .eq('approved', true)
        .order('vote_count', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData = (data || []).map(entry => ({
        ...entry,
        profiles: entry.profiles ? {
          full_name: entry.profiles.full_name || '',
          username: entry.profiles.username || ''
        } : undefined
      }));
      
      setContestEntries(transformedData);
    } catch (error) {
      console.error('Error fetching contest entries:', error);
      toast.error('Failed to load contest entries');
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

      if (error) throw error;

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
      const voteData: any = {
        contest_entry_id: entryId,
        ip_address: 'unknown' // You'd capture real IP in production
      };

      if (user) {
        voteData.user_id = user.id;
      } else if (voterPhone) {
        voteData.voter_phone = voterPhone;
      } else {
        toast.error('Please log in or provide a phone number to vote');
        return false;
      }

      const { error } = await supabase
        .from('votes')
        .insert(voteData);

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast.error('You have already voted for this entry');
        } else {
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
      toast.error('Failed to download instrumental');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchContests();
      setLoading(false);
    };

    loadData();
  }, []);

  useEffect(() => {
    if (currentContest) {
      fetchContestEntries(currentContest.id);
    }
  }, [currentContest]);

  return {
    contests,
    currentContest,
    contestEntries,
    loading,
    submitting,
    submitEntry,
    voteForEntry,
    downloadInstrumental,
    refreshEntries: () => currentContest && fetchContestEntries(currentContest.id),
    refreshContests: fetchContests
  };
};
