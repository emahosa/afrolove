
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { checkUserCredits } from '@/utils/credits';

console.log("✅ use-contest hook loaded - WILL ONLY USE: contests, contest_entries, profiles, votes, unlocked_contests");

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
  is_unlocked?: boolean;
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
  const { user, updateUserCredits, isSubscriber } = useAuth();
  const [contests, setContests] = useState<Contest[]>([]);
  const [activeContests, setActiveContests] = useState<Contest[]>([]);
  const [currentContest, setCurrentContest] = useState<Contest | null>(null);
  const [unlockedContestIds, setUnlockedContestIds] = useState<Set<string>>(new Set());
  const [contestEntries, setContestEntries] = useState<ContestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch active contests - ONLY contests table
  const fetchContests = useCallback(async () => {
    try {
      console.log('🔄 use-contest: fetchContests()');
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contests:', error);
        throw error;
      }
      
      setContests(data || []);
      
      let newUnlockedIds = new Set<string>();
      if (user) {
        const { data: unlockedData, error: unlockedError } = await supabase
          .from('unlocked_contests')
          .select('contest_id')
          .eq('user_id', user.id);

        if (unlockedError) {
          console.error('Error fetching unlocked contests:', unlockedError);
        } else {
          newUnlockedIds = new Set(unlockedData.map(item => item.contest_id));
        }
      }
      setUnlockedContestIds(newUnlockedIds);
      
      const activeContestsData = data
        ?.filter(contest => contest.status === 'active')
        .map(contest => ({
          ...contest,
          is_unlocked: newUnlockedIds.has(contest.id)
        })) || [];
      
      setActiveContests(activeContestsData);
      
      if (activeContestsData.length > 0) {
        const firstContest = activeContestsData[0];
        setCurrentContest(firstContest);
        console.log('Set current contest:', firstContest);
      } else {
        setCurrentContest(null);
      }
    } catch (error: any) {
      console.error('Error in fetchContests:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      setError(errorMessage);
      toast.error('Failed to load contests: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

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
      console.log('🔄 use-contest: createContest() - ONLY contests table');
      
      const { error } = await supabase
        .from('contests')
        .insert({
          ...contestData,
          status: 'active',
          terms_conditions: 'By submitting an entry, you acknowledge that you have read and agreed to these rules.',
          created_by: user.id
        });

      console.log('✅ Successfully inserted into contests table');

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
      console.log('🔄 use-contest: updateContest() - ONLY contests table');
      
      const { error } = await supabase
        .from('contests')
        .update({
          ...contestData,
          updated_at: new Date().toISOString()
        })
        .eq('id', contestId);

      console.log('✅ Successfully updated contests table');

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

  // Delete contest - handles dependencies
  const deleteContest = async (contestId: string) => {
    if (!user) {
      toast.error('Please log in to delete contests');
      return false;
    }
    
    try {
      console.log('🔄 use-contest: deleteContest() - Deleting dependencies first');

      const { data: entries, error: entriesError } = await supabase
        .from('contest_entries')
        .select('id')
        .eq('contest_id', contestId);

      if (entriesError) throw entriesError;

      if (entries && entries.length > 0) {
        const entryIds = entries.map(e => e.id);

        console.log('🗑️ Deleting votes for entries:', entryIds);
        const { error: votesError } = await supabase.from('votes').delete().in('contest_entry_id', entryIds);
        if (votesError) throw votesError;

        console.log('🗑️ Deleting contest_votes for contest:', contestId);
        const { error: contestVotesError } = await supabase.from('contest_votes').delete().eq('contest_id', contestId);
        if (contestVotesError) console.warn('Could not delete from contest_votes, continuing...', contestVotesError);

        console.log('🗑️ Deleting contest entries:', entryIds);
        const { error: deleteEntriesError } = await supabase.from('contest_entries').delete().in('id', entryIds);
        if (deleteEntriesError) throw deleteEntriesError;
      }
      
      console.log('🗑️ Deleting unlocked_contests records for contest:', contestId);
      const { error: unlockedError } = await supabase.from('unlocked_contests').delete().eq('contest_id', contestId);
      if (unlockedError) console.warn('Could not delete from unlocked_contests, continuing...', unlockedError);

      console.log('🗑️ Deleting contest itself:', contestId);
      const { error: contestError } = await supabase.from('contests').delete().eq('id', contestId);
      if (contestError) throw contestError;

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
      console.log('🔄 use-contest: fetchContestEntries() - ONLY contest_entries + profiles');
      setError(null);
      
      console.log('🔍 Step 1: About to query supabase.from("contest_entries")');
      
      // First get contest entries
      const { data: entriesData, error: entriesError } = await supabase
        .from('contest_entries')
        .select('*')
        .eq('contest_id', contestId)
        .eq('approved', true)
        .order('vote_count', { ascending: false });

      console.log('✅ Successfully queried contest_entries table');

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

          console.log('✅ Successfully queried profiles table');

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
      
      console.log('✅ Combined entries with profiles');
      setContestEntries(entriesWithProfiles);
    } catch (error: any) {
      console.error('Error fetching contest entries:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      setError(errorMessage);
      toast.error('Failed to load contest entries: ' + errorMessage);
      setContestEntries([]);
    }
  };

  // Unlock a contest - only for subscribers
  const unlockContest = async (contestId: string, fee: number) => {
    if (!user) {
      toast.error('Please log in to unlock contests');
      return false;
    }

    // Only subscribers can unlock contests
    if (!isSubscriber()) {
      toast.error('Only subscribers can unlock contests. Please subscribe to access this feature.');
      return false;
    }

    if (fee === 0) {
      // If contest is free, just mark as unlocked locally
      setUnlockedContestIds(prev => new Set(prev).add(contestId));
      setActiveContests(prev => prev.map(c => c.id === contestId ? { ...c, is_unlocked: true } : c));
      toast.success('Free contest unlocked!');
      return true;
    }

    try {
      setSubmitting(true);
      const userCredits = await checkUserCredits(user.id);
      if (userCredits < fee) {
        toast.error(`You need ${fee} credits to unlock this contest. You only have ${userCredits}.`);
        return false;
      }

      await updateUserCredits(-fee);

      const { error: unlockError } = await supabase
        .from('unlocked_contests')
        .insert({ user_id: user.id, contest_id: contestId });

      if (unlockError) {
        await updateUserCredits(fee); // Refund
        throw unlockError;
      }

      setUnlockedContestIds(prev => new Set(prev).add(contestId));
      setActiveContests(prev => prev.map(c => c.id === contestId ? { ...c, is_unlocked: true } : c));
      if (currentContest?.id === contestId) {
          setCurrentContest(prev => prev ? { ...prev, is_unlocked: true } : null);
      }

      toast.success('Contest unlocked!');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to unlock contest.');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Submit contest entry with file upload - FIXED
  const submitEntry = async (contestId: string, videoFile: File, description: string, title: string) => {
    if (!user) {
      toast.error('Please log in to submit an entry');
      return false;
    }

    setSubmitting(true);
    try {
      console.log('🔄 use-contest: submitEntry() - Starting submission process');
      
      const timestamp = Date.now();
      const fileExtension = videoFile.name.split('.').pop() || 'mp4';
      const cleanTitle = title.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `${timestamp}_${cleanTitle}.${fileExtension}`;
      
      console.log('📁 use-contest:submitEntry - Attempting to upload file:', filename, 'Size:', videoFile.size, 'Type:', videoFile.type);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('instrumentals')
        .upload(`entries/${filename}`, videoFile, {
          contentType: videoFile.type,
          upsert: false
        });

      if (uploadError) {
        console.error('❌ use-contest:submitEntry - Supabase storage upload error:', uploadError);
        toast.error(`Upload failed: ${uploadError.message}. Please try a different file or check your connection.`);
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      if (!uploadData || !uploadData.path) {
        console.error('❌ use-contest:submitEntry - Supabase storage upload returned no data or path.');
        toast.error('Upload process failed: No file path returned after upload. Please contact support.');
        throw new Error('Upload process failed: No file path returned after upload.');
      }

      console.log('✅ use-contest:submitEntry - File uploaded successfully. Path:', uploadData.path);

      console.log('🔗 use-contest:submitEntry - Attempting to get public URL for path:', `entries/${filename}`);
      const { data: publicUrlData } = supabase.storage
        .from('instrumentals')
        .getPublicUrl(`entries/${filename}`);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        console.error('❌ use-contest:submitEntry - Supabase storage getPublicUrl returned no publicUrl.');
        toast.error('Failed to process file: No public URL generated. Please contact support.');
        await supabase.storage.from('instrumentals').remove([`entries/${filename}`]);
        console.log('🗑️ use-contest:submitEntry - Orphaned file deleted due to no public URL:', `entries/${filename}`);
        throw new Error('Failed to process file: No public URL generated.');
      }
      const publicUrl = publicUrlData.publicUrl;
      console.log('🔗 use-contest:submitEntry - Public URL generated:', publicUrl);

      console.log('📝 use-contest:submitEntry - Attempting to insert contest entry into database.');
      const { data: insertData, error: insertError } = await supabase
        .from('contest_entries')
        .insert({
          contest_id: contestId,
          user_id: user.id,
          video_url: publicUrl,
          description: description || '',
          media_type: videoFile.type.startsWith('video/') ? 'video' : 'audio',
          approved: true // Auto-approve for now
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ use-contest:submitEntry - Supabase database insert error:', insertError);
        toast.error(`Failed to save entry: ${insertError.message}. Please try again.`);
        await supabase.storage.from('instrumentals').remove([`entries/${filename}`]);
        console.log('🗑️ use-contest:submitEntry - Orphaned file deleted due to DB insert failure:', `entries/${filename}`);
        throw new Error(`Failed to save entry: ${insertError.message}`);
      }

      console.log('✅ use-contest:submitEntry - Entry saved successfully. ID:', insertData.id);
      
      toast.success('Entry submitted successfully!');
      
      if (currentContest) {
        console.log('🔄 use-contest:submitEntry - Refreshing contest entries for contest ID:', currentContest.id);
        await fetchContestEntries(currentContest.id);
      }
      
      return true;
    } catch (error: any) {
      console.error('❌ use-contest:submitEntry - Error during submission process:', error.message);
      toast.error(error.message || 'An unexpected error occurred during submission. Please try again.');
      return false;
    } finally {
      console.log('🏁 use-contest:submitEntry - Submission process finished. Setting submitting to false.');
      setSubmitting(false);
    }
  };

  // Vote for an entry - ONLY votes table
  const voteForEntry = async (entryId: string, voterPhone?: string) => {
    try {
      console.log('🔄 use-contest: voteForEntry() - ONLY votes table');
      console.log('Submitting vote for entry:', entryId);
      
      const voteData: any = {
        contest_entry_id: entryId,
        voter_phone: voterPhone || 'anonymous'
      };

      console.log('🔍 About to insert into supabase.from("votes")');

      const { error } = await supabase
        .from('votes')
        .insert(voteData);

      console.log('✅ Successfully inserted into votes table');

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
      console.log('🔄 use-contest: downloadInstrumental() - Starting download');
      
      // Check if user has enough credits (cost: 1 credit)
      const currentCredits = await checkUserCredits(user.id);
      if (currentCredits < 1) {
        toast.error('You need at least 1 credit to download instrumentals. Please purchase credits first.');
        return;
      }

      // Deduct credit
      await updateUserCredits(-1);
      
      // Create a clean filename using the actual contest title
      const cleanFileName = contestTitle.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').toLowerCase();
      const fileName = `${cleanFileName}_instrumental.mp3`;
      
      // Download the file
      const link = document.createElement('a');
      link.href = instrumentalUrl;
      link.download = fileName;
      link.style.display = 'none';
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
    fetchContests();
  }, [fetchContests]);

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
    unlockContest,
    refreshEntries: () => currentContest && fetchContestEntries(currentContest.id),
    refreshContests: fetchContests,
    setCurrentContest
  };
};
