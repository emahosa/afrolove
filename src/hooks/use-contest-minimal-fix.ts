// Quick fix for use-contest build errors
import { supabase } from '@/integrations/supabase/client';

export const castVoteWithFixedTypes = async (entryId: string, contestId: string, numVotes: number) => {
  try {
    const { data, error } = await supabase.rpc('cast_vote', {
      entry_id: entryId,
      p_contest_id: contestId,
      p_num_votes: numVotes,
    });

    if (error) throw error;

    const result = data as any;
    if (result?.success) {
      return { success: true, message: result.message || 'Vote cast successfully' };
    } else {
      return { success: false, message: result?.message || 'Failed to cast vote' };
    }
  } catch (error: any) {
    console.error('Error casting vote:', error);
    throw error;
  }
};