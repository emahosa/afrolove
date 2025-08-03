
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

      // Create contest entry
      const entryData = {
        contest_id: data.contestId,
        user_id: user.id,
        song_id: data.songId || null,
        video_url: null,
        description: data.description || null,
        status: 'pending' as const,
        approved: false,
        media_type: 'audio' as const
      };

      console.log('Creating contest entry:', entryData);

      const { data: entry, error: entryError } = await supabase
        .from('contest_entries')
        .insert(entryData)
        .select()
        .single();

      if (entryError) {
        console.error('Contest entry creation error:', entryError);
        throw new Error(`Failed to create contest entry: ${entryError.message}`);
      }

      console.log('Contest entry created successfully:', entry);
      toast.success('Entry submitted successfully! Awaiting approval.');
      
      return entry;

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
