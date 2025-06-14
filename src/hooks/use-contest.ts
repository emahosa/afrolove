import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { checkUserCredits, updateUserCredits } from '@/utils/credits';

console.log("✅ use-contest hook loaded - WILL ONLY USE: contests, contest_entries, profiles, votes");

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
  entry_fee: number;
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
  } | null;
}

export const useContest = () => {
  const { user } = useAuth();
  const [contests, setContests] = useState<Contest[]>([]);
  const [activeContests, setActiveContests] = useState<Contest[]>([]);
  const [currentContest, setCurrentContest] = useState<Contest | null>(null);
  const [contestEntries, setContestEntries] = useState<ContestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch active contests - ONLY contests table
  const fetchContests = async () => {
    try {
      console.log('🔄 use-contest: fetchContests() - ONLY contests table, NO USERS');
      setError(null);
      
      console.log('🔍 About to query supabase.from("contests") - NO USERS TABLE');
      
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('✅ Successfully queried contests table, no users table referenced');

      if (error) {
        console.error('Error fetching contests:', error);
        throw error;
      }
      
      console.log('Contests fetched successfully:', data);
      setContests(data || []);
      
      // Set all active contests
      const activeContestsData = data?.filter(contest => contest.status === 'active') || [];
      setActiveContests(activeContestsData);
      
      if (activeContestsData.length > 0) {
        setCurrentContest(activeContestsData[0]);
        console.log('Set current contest:', activeContestsData[0]);
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

  // Create new contest - ONLY contests table
  const createContest = async (contestData: {
    title: string;
    description: string;
    prize: string;
    rules: string;
    start_date: string;
    end_date: string;
    instrumental_url: string;
    entry_fee: number;
  }) => {
    if (!user) {
      toast.error('Please log in to create contests');
      return false;
    }

    try {
      console.log('🔄 use-contest: createContest() - ONLY contests table, NO USERS');
      
      const { error } = await supabase
        .from('contests')
        .insert({
          ...contestData,
          status: 'active',
          terms_conditions: 'By submitting an entry, you acknowledge that you have read and agreed to these rules.',
          created_by: user.id
        });

      console.log('✅ Successfully inserted into contests table, no users table referenced');

      if (error) {
        console.error('Error creating contest:', error);
        throw error;
      }

      toast.success('Contest created successfully!');
      await fetchContests();
      return true;
    } catch (error: any) {
      console.error('Error creating contest:', error);
      toast.error(error.message || 'Failed to create contest');
      return false;
    }
  };

  // Update contest - ONLY contests table
  const updateContest = async (contestId: string, contestData: {
    title: string;
    description: string;
    prize: string;
    rules: string;
    start_date: string;
    end_date: string;
    instrumental_url: string;
    entry_fee: number;
  }) => {
    if (!user) {
      toast.error('Please log in to update contests');
      return false;
    }

    try {
      console.log('🔄 use-contest: updateContest() - ONLY contests table, NO USERS');
      
      const { error } = await supabase
        .from('contests')
        .update({
          ...contestData,
          updated_at: new Date().toISOString()
        })
        .eq('id', contestId);

      console.log('✅ Successfully updated contests table, no users table referenced');

      if (error) {
        console.error('Error updating contest:', error);
        throw error;
      }

      toast.success('Contest updated successfully!');
      await fetchContests();
      return true;
    } catch (error: any) {
      console.error('Error updating contest:', error);
      toast.error(error.message || 'Failed to update contest');
      return false;
    }
  };

  // Delete contest - ONLY contests table
  const deleteContest = async (contestId: string) => {
    if (!user) {
      toast.error('Please log in to delete contests');
      return false;
    }

    try {
      console.log('🔄 use-contest: deleteContest() - ONLY contests table, NO USERS');
      
      const { error } = await supabase
        .from('contests')
        .delete()
        .eq('id', contestId);

      console.log('✅ Successfully deleted from contests table, no users table referenced');

      if (error) {
        console.error('Error deleting contest:', error);
        throw error;
      }

      toast.success('Contest deleted successfully!');
      await fetchContests();
      return true;
    } catch (error: any) {
      console.error('Error deleting contest:', error);
      toast.error(error.message || 'Failed to delete contest');
      return false;
    }
  };

  // Fetch entries for current contest - ONLY contest_entries + profiles
  const fetchContestEntries = async (contestId: string) => {
    if (!contestId) {
      console.log('No contest ID provided for fetching entries');
      setContestEntries([]);
      return;
    }

    try {
      console.log('🔄 use-contest: fetchContestEntries() - ONLY contest_entries + profiles, NO USERS');
      setError(null);
      
      console.log('🔍 Step 1: About to query supabase.from("contest_entries") - NO USERS TABLE');
      
      // First get contest entries - NO USERS TABLE
      const { data: entriesData, error: entriesError } = await supabase
        .from('contest_entries')
        .select('*')
        .eq('contest_id', contestId)
        .eq('approved', true)
        .order('vote_count', { ascending: false });

      console.log('✅ Successfully queried contest_entries table, no users table referenced');

      if (entriesError) {
        console.error('Error fetching entries:', entriesError);
        throw entriesError;
      }

      console.log('Contest entries fetched:', entriesData);
      
      // Then get profiles for each entry separately - PROFILES TABLE ONLY
      const entriesWithProfiles = await Promise.all(
        (entriesData || []).map(async (entry) => {
          console.log('🔍 About to query supabase.from("profiles") for user:', entry.user_id);
          
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, username')
            .eq('id', entry.user_id)
            .single();

          console.log('✅ Successfully queried profiles table, no users table referenced');

          return {
            id: entry.id,
            contest_id: entry.contest_id,
            user_id: entry.user_id,
            video_url: entry.video_url || '',
            description: entry.description || '',
            approved: entry.approved,
            vote_count: entry.vote_count || 0,
            media_type: entry.media_type || 'video',
            created_at: entry.created_at,
            profiles: profileData ? {
              full_name: profileData.full_name || '',
              username: profileData.username || ''
            } : null
          };
        })
      );
      
      console.log('✅ Combined entries with profiles, no users table used');
      setContestEntries(entriesWithProfiles);
    } catch (error: any) {
      console.error('Error fetching contest entries:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      setError(errorMessage);
      toast.error('Failed to load contest entries: ' + errorMessage);
      setContestEntries([]);
    }
  };

  // Submit contest entry with file upload - ONLY contest_entries table
  const submitEntry = async (contestId: string, videoFile: File, description: string, title: string) => {
    if (!user) {
      toast.error('Please log in to submit an entry');
      return false;
    }

    setSubmitting(true);
    try {
      console.log('🔄 use-contest: submitEntry() - ONLY contest_entries table, NO USERS');
      
      // Upload file to Supabase Storage
      const timestamp = Date.now();
      const filename = `${timestamp}_${videoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('instrumentals')
        .upload(`entries/${filename}`, videoFile, {
          contentType: videoFile.type,
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload file: ' + uploadError.message);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('instrumentals')
        .getPublicUrl(`entries/${filename}`);

      console.log('🔍 About to insert into supabase.from("contest_entries") - NO USERS TABLE');

      const { error } = await supabase
        .from('contest_entries')
        .insert({
          contest_id: contestId,
          user_id: user.id,
          video_url: publicUrl,
          description,
          media_type: videoFile.type.startsWith('video/') ? 'video' : 'audio',
          approved: false // Pending admin approval
        });

      console.log('✅ Successfully inserted into contest_entries table, no users table referenced');

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

  // Vote for an entry - ONLY votes table
  const voteForEntry = async (entryId: string, voterPhone?: string) => {
    try {
      console.log('🔄 use-contest: voteForEntry() - ONLY votes table, NO USERS');
      console.log('Submitting vote for entry:', entryId);
      
      const voteData: any = {
        contest_entry_id: entryId, // Updated to use the new column name
        voter_phone: voterPhone || 'anonymous'
      };

      console.log('🔍 About to insert into supabase.from("votes") - NO USERS TABLE');

      const { error } = await supabase
        .from('votes')
        .insert(voteData);

      console.log('✅ Successfully inserted into votes table, no users table referenced');

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

  // Download instrumental with credit check
  const downloadInstrumental = async (instrumentalUrl: string, contestTitle: string) => {
    if (!user) {
      toast.error('Please log in to download instrumentals');
      return;
    }

    try {
      console.log('🔄 use-contest: downloadInstrumental() - Checking credits first');
      
      // Check if user has enough credits (cost: 1 credit)
      const currentCredits = await checkUserCredits(user.id);
      if (currentCredits < 1) {
        toast.error('You need at least 1 credit to download instrumentals. Please purchase credits first.');
        return;
      }

      // Deduct credit
      await updateUserCredits(user.id, -1);
      
      // Download the file
      const link = document.createElement('a');
      link.href = instrumentalUrl;
      link.download = `${contestTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_instrumental.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Instrumental downloaded! 1 credit used.');
    } catch (error) {
      console.error('Error downloading instrumental:', error);
      toast.error('Failed to download instrumental');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      console.log('🚀 use-contest: Loading contest data - WILL ONLY USE: contests, contest_entries, profiles, votes');
      setLoading(true);
      await fetchContests();
      setLoading(false);
    };

    loadData();
  }, []);

  useEffect(() => {
    if (currentContest) {
      console.log('🎯 use-contest: Current contest changed, fetching entries - PROFILES ONLY:', currentContest.id);
      fetchContestEntries(currentContest.id);
    }
  }, [currentContest]);

  return {
    contests,
    activeContests,
    currentContest,
    contestEntries,
    loading,
    submitting,
    error,
    createContest,
    updateContest,
    deleteContest,
    submitEntry,
    voteForEntry,
    downloadInstrumental,
    refreshEntries: () => currentContest && fetchContestEntries(currentContest.id),
    refreshContests: fetchContests,
    setCurrentContest
  };
};
