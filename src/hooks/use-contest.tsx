
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { updateUserCredits } from "@/utils/credits";

interface Contest {
  id: string;
  title: string;
  description: string;
  rules: string;
  prize: string;
  start_date: string;
  end_date: string;
  instrumental_url: string | null;
  entry_fee: number;
  is_unlocked?: boolean;
}

interface ContestEntry {
  id: string;
  contest_id: string;
  user_id: string;
  video_url: string | null;
  description: string | null;
  vote_count: number;
  approved: boolean;
  created_at: string;
  profiles: {
    full_name: string | null;
    username: string | null;
  } | null;
}

export const useContest = () => {
  const { user } = useAuth();
  const [activeContests, setActiveContests] = useState<Contest[]>([]);
  const [currentContest, setCurrentContest] = useState<Contest | null>(null);
  const [contestEntries, setContestEntries] = useState<ContestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchActiveContests();
  }, [user]);

  useEffect(() => {
    if (currentContest) {
      fetchContestEntries(currentContest.id);
    }
  }, [currentContest]);

  const fetchActiveContests = async () => {
    try {
      console.log("Fetching active contests...");
      
      const { data: contests, error } = await supabase
        .from("contests")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching contests:", error);
        throw error;
      }

      console.log("Fetched contests:", contests);

      if (contests && contests.length > 0) {
        // Check which contests are unlocked for this user
        let contestsWithUnlockStatus = contests;
        
        if (user) {
          const { data: unlockedContests } = await supabase
            .from("unlocked_contests")
            .select("contest_id")
            .eq("user_id", user.id);
          
          const unlockedIds = unlockedContests?.map(uc => uc.contest_id) || [];
          
          contestsWithUnlockStatus = contests.map(contest => ({
            ...contest,
            is_unlocked: contest.entry_fee === 0 || unlockedIds.includes(contest.id)
          }));
        }

        setActiveContests(contestsWithUnlockStatus);
        
        if (!currentContest && contestsWithUnlockStatus.length > 0) {
          setCurrentContest(contestsWithUnlockStatus[0]);
        }
      } else {
        setActiveContests([]);
        setCurrentContest(null);
      }
    } catch (error: any) {
      console.error("Error in fetchActiveContests:", error);
      toast.error("Failed to load contests");
    } finally {
      setLoading(false);
    }
  };

  const fetchContestEntries = async (contestId: string) => {
    try {
      console.log("Fetching contest entries for:", contestId);
      
      const { data: entries, error } = await supabase
        .from("contest_entries")
        .select(`
          *,
          profiles (
            full_name,
            username
          )
        `)
        .eq("contest_id", contestId)
        .eq("approved", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching contest entries:", error);
        throw error;
      }

      console.log("Fetched contest entries:", entries);
      setContestEntries(entries || []);
    } catch (error: any) {
      console.error("Error in fetchContestEntries:", error);
      toast.error("Failed to load contest entries");
    }
  };

  const submitEntry = async (
    contestId: string,
    file: File,
    description: string,
    title: string
  ): Promise<boolean> => {
    if (!user) {
      toast.error("Please log in to submit an entry.");
      return false;
    }

    setSubmitting(true);
    try {
      console.log("Submitting contest entry...", { contestId, title, fileSize: file.size });

      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `contest-entries/${fileName}`;

      console.log("Uploading file to:", filePath);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio_files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log("File uploaded successfully:", uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('audio_files')
        .getPublicUrl(filePath);

      console.log("File public URL:", publicUrl);

      // Insert contest entry
      const { data: entryData, error: entryError } = await supabase
        .from("contest_entries")
        .insert({
          contest_id: contestId,
          user_id: user.id,
          video_url: publicUrl,
          description: description,
          media_type: file.type.startsWith('video/') ? 'video' : 'audio',
          approved: false, // Entries need approval
          vote_count: 0
        })
        .select()
        .single();

      if (entryError) {
        console.error("Entry creation error:", entryError);
        throw new Error(`Failed to create entry: ${entryError.message}`);
      }

      console.log("Contest entry created successfully:", entryData);

      toast.success("Entry submitted successfully! It will be reviewed before appearing in the contest.");
      
      // Refresh contest entries
      await fetchContestEntries(contestId);
      
      return true;
    } catch (error: any) {
      console.error("Error submitting contest entry:", error);
      toast.error(error.message || "Failed to submit entry. Please try again.");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const voteForEntry = async (entryId: string, voterPhone?: string): Promise<boolean> => {
    if (!user) {
      toast.error("Please log in to vote.");
      return false;
    }

    try {
      console.log("Voting for entry:", entryId);

      // Check if user already voted for this entry
      const { data: existingVote } = await supabase
        .from("contest_votes")
        .select("id")
        .eq("contest_entry_id", entryId)
        .eq("user_id", user.id)
        .single();

      if (existingVote) {
        toast.error("You have already voted for this entry.");
        return false;
      }

      // Get contest ID from entry
      const { data: entry } = await supabase
        .from("contest_entries")
        .select("contest_id")
        .eq("id", entryId)
        .single();

      if (!entry) {
        throw new Error("Contest entry not found");
      }

      // Insert vote
      const { error: voteError } = await supabase
        .from("contest_votes")
        .insert({
          contest_id: entry.contest_id,
          contest_entry_id: entryId,
          user_id: user.id,
          voter_phone: voterPhone || null
        });

      if (voteError) {
        console.error("Vote error:", voteError);
        throw new Error(`Failed to record vote: ${voteError.message}`);
      }

      toast.success("Vote recorded successfully!");
      
      // Refresh contest entries to update vote counts
      if (currentContest) {
        await fetchContestEntries(currentContest.id);
      }
      
      return true;
    } catch (error: any) {
      console.error("Error voting:", error);
      toast.error(error.message || "Failed to record vote. Please try again.");
      return false;
    }
  };

  const unlockContest = async (contestId: string, cost: number): Promise<void> => {
    if (!user) {
      toast.error("Please log in to unlock contests.");
      return;
    }

    try {
      console.log("Unlocking contest:", { contestId, cost });

      // Check if user has enough credits
      const { data: profile } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .single();

      if (!profile || profile.credits < cost) {
        toast.error("Insufficient credits to unlock this contest.");
        return;
      }

      // Deduct credits
      await updateUserCredits(user.id, -cost);

      // Add to unlocked contests
      const { error: unlockError } = await supabase
        .from("unlocked_contests")
        .insert({
          user_id: user.id,
          contest_id: contestId
        });

      if (unlockError && unlockError.code !== '23505') { // Ignore duplicate key error
        throw unlockError;
      }

      toast.success("Contest unlocked successfully!");
      
      // Refresh contests to update unlock status
      await fetchActiveContests();
    } catch (error: any) {
      console.error("Error unlocking contest:", error);
      toast.error("Failed to unlock contest. Please try again.");
    }
  };

  const downloadInstrumental = async (url: string, contestTitle: string) => {
    try {
      console.log("Downloading instrumental:", url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${contestTitle}-instrumental.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success("Instrumental downloaded successfully!");
    } catch (error: any) {
      console.error("Error downloading instrumental:", error);
      toast.error("Failed to download instrumental. Please try again.");
    }
  };

  return {
    activeContests,
    currentContest,
    contestEntries,
    loading,
    submitting,
    submitEntry,
    voteForEntry,
    downloadInstrumental,
    unlockContest,
    setCurrentContest
  };
};
