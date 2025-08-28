
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ContestSubmissionData {
  contestId: string;
  songId?: string;
  description?: string;
}

export const useContestSubmission = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitEntry = async (data: ContestSubmissionData) => {
    setIsSubmitting(true);
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data: rpcData, error: rpcError } = await supabase.rpc('submit_contest_entry', {
        p_contest_id: data.contestId,
        p_song_id: data.songId,
        p_description: data.description,
      });

      if (rpcError) {
        console.error('Contest entry submission RPC error:', rpcError);
        throw new Error(`Failed to submit entry: ${rpcError.message}`);
      }

      if (!rpcData.success) {
        throw new Error(rpcData.message);
      }

      toast.success(rpcData.message);
      
      return rpcData;

    } catch (error: any) {
      console.error('Contest submission error:', error);
      toast.error(error.message || 'Failed to submit entry');
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitEntry,
    isSubmitting
  };
};
