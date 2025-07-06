
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ensureStorageBuckets } from '@/utils/storageSetup';

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
      console.log('Starting contest submission:', data);
      
      // Ensure storage buckets exist
      await ensureStorageBuckets();
      console.log('Storage buckets verified');

      let videoUrl = null;

      // Upload video file if provided
      if (data.videoFile) {
        console.log('Uploading video file...');
        const fileExt = data.videoFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('contest-videos')
          .upload(fileName, data.videoFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Failed to upload video: ${uploadError.message}`);
          return false;
        }

        const { data: urlData } = supabase.storage
          .from('contest-videos')
          .getPublicUrl(uploadData.path);

        videoUrl = urlData.publicUrl;
        console.log('Video uploaded successfully:', videoUrl);
      }

      // Create contest entry
      const entryData = {
        contest_id: data.contestId,
        user_id: user.id,
        song_id: data.songId || null,
        video_url: videoUrl,
        description: data.description,
        status: 'pending' as const,
        approved: false
      };

      console.log('Creating contest entry:', entryData);

      const { data: entryResult, error: entryError } = await supabase
        .from('contest_entries')
        .insert(entryData)
        .select()
        .single();

      if (entryError) {
        console.error('Entry creation error:', entryError);
        
        // Clean up uploaded video if entry creation fails
        if (videoUrl && data.videoFile) {
          try {
            const uploadedFileName = videoUrl.split('/').pop();
            if (uploadedFileName) {
              await supabase.storage.from('contest-videos').remove([uploadedFileName]);
              console.log('Cleaned up uploaded video due to entry error');
            }
          } catch (cleanupError) {
            console.error('Error cleaning up uploaded file:', cleanupError);
          }
        }

        if (entryError.message.includes('duplicate')) {
          toast.error('You have already submitted an entry for this contest');
        } else if (entryError.message.includes('policy')) {
          toast.error('You do not have permission to submit entries. Please ensure you have the required subscription.');
        } else {
          toast.error(`Failed to create entry: ${entryError.message}`);
        }
        return false;
      }

      console.log('Contest entry created successfully:', entryResult);
      toast.success('Contest entry submitted successfully! It will be reviewed before appearing publicly.');
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
