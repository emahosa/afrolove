
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ContestSubmissionData {
  contestId: string;
  songId?: string;
  videoFile?: File;
  description?: string;
}

export const useContestSubmission = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitEntry = async (data: ContestSubmissionData) => {
    setIsSubmitting(true);
    
    try {
      let videoUrl = null;

      // Upload video if provided
      if (data.videoFile) {
        const fileExt = data.videoFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        
        console.log('Uploading video file:', fileName);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('contest-videos')
          .upload(`${fileName}`, data.videoFile);

        if (uploadError) {
          console.error('Video upload error:', uploadError);
          throw new Error('Failed to upload video');
        }

        const { data: urlData } = supabase.storage
          .from('contest-videos')
          .getPublicUrl(`${fileName}`);

        videoUrl = urlData.publicUrl;
        console.log('Video uploaded successfully:', videoUrl);
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Create contest entry
      const entryData = {
        contest_id: data.contestId,
        user_id: user.id,
        song_id: data.songId || null,
        video_url: videoUrl,
        description: data.description || null,
        status: 'pending' as const,
        approved: false,
        media_type: data.videoFile ? 'video' : 'audio'
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
