
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface SubmissionData {
  contestId: string;
  songId?: string;
  videoFile?: File;
  description: string;
}

export const useContestSubmission = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const submitEntry = async (data: SubmissionData) => {
    if (!user) {
      toast.error('You must be logged in to submit an entry');
      return false;
    }

    setIsSubmitting(true);

    try {
      let videoUrl = null;

      // Upload video file if provided
      if (data.videoFile) {
        const fileExt = data.videoFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        
        console.log('Uploading video file:', fileName);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('contest-videos')
          .upload(fileName, data.videoFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Failed to upload video: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('contest-videos')
          .getPublicUrl(uploadData.path);
        
        videoUrl = urlData.publicUrl;
        console.log('Video uploaded successfully:', videoUrl);
      }

      // Create contest entry
      const { data: entryData, error: entryError } = await supabase
        .from('contest_entries')
        .insert({
          contest_id: data.contestId,
          user_id: user.id,
          song_id: data.songId || null,
          video_url: videoUrl,
          description: data.description,
          status: 'pending',
          approved: false
        })
        .select()
        .single();

      if (entryError) {
        console.error('Entry creation error:', entryError);
        throw new Error(`Failed to create entry: ${entryError.message}`);
      }

      console.log('Contest entry created successfully:', entryData);
      toast.success('Contest entry submitted successfully!');
      return true;

    } catch (error: any) {
      console.error('Contest submission error:', error);
      toast.error(error.message || 'Failed to submit contest entry');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitEntry,
    isSubmitting
  };
};
