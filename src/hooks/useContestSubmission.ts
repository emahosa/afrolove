
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

    const timeoutPromise = <T>(duration: number, operationName: string, promise: Promise<T>): Promise<T> =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`${operationName} timed out after ${duration / 1000}s`));
        }, duration);
        promise.then(resolve).catch(reject).finally(() => clearTimeout(timer));
      });

    try {
      // Ensure storage buckets exist, with a timeout
      try {
        await timeoutPromise(15000, 'Storage setup check', ensureStorageBuckets());
      } catch (storageSetupError) {
        console.error('Storage setup check failed:', storageSetupError);
        toast.error(storageSetupError.message || 'Failed to prepare for submission.');
        return false; // Explicitly return false, finally will still run
      }

      let videoUrl = null;

      // Upload video file if provided
      if (data.videoFile) {
        const fileExt = data.videoFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        console.log('Uploading video file:', fileName);

        const uploadOperation = supabase.storage
          .from('contest-videos')
          .upload(fileName, data.videoFile, {
            cacheControl: '3600',
            upsert: false
          });

        const timeoutPromise = <T>(duration: number, operationName: string, promise: Promise<T>): Promise<T> =>
          new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
              reject(new Error(`${operationName} timed out after ${duration / 1000}s`));
            }, duration);
            promise.then(resolve).catch(reject).finally(() => clearTimeout(timer));
          });

        try {
          const { data: uploadData, error: uploadError } = await timeoutPromise(60000, 'Video upload', uploadOperation);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            toast.error(`Failed to upload video: ${uploadError.message}`);
            // No explicit return false here, finally block will handle setIsSubmitting
            // Let the main catch block handle the error for consistent return.
            throw uploadError;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('contest-videos')
            .getPublicUrl(uploadData.path);

          videoUrl = urlData.publicUrl;
          console.log('Video uploaded successfully:', videoUrl);

        } catch (uploadRelatedError) {
          // This catches both timeout and actual upload errors
          console.error('Video upload process failed:', uploadRelatedError);
          toast.error(uploadRelatedError.message || 'Video upload failed.');
          return false; // Return false as the operation failed
        }
      }

      // Create contest entry with proper typing
      const entryData = {
        contest_id: data.contestId,
        user_id: user.id,
        song_id: data.songId || null,
        video_url: videoUrl,
        description: data.description,
        status: 'pending' as const,
        approved: false
      };

      console.log('Creating contest entry with data:', entryData);

      const insertOperation = supabase
        .from('contest_entries')
        .insert(entryData)
        .select()
        .single();

      try {
        const { data: entryResult, error: entryError } = await timeoutPromise(30000, 'Database insert', insertOperation);

        if (entryError) {
          console.error('Entry creation error:', entryError);
          // Clean up uploaded video if entry creation fails
          if (videoUrl && data.videoFile) {
            try {
              const uploadedFileName = videoUrl.split('/').pop();
              if (uploadedFileName) {
                await supabase.storage.from('contest-videos').remove([uploadedFileName]);
                console.log('Cleaned up uploaded video due to entry error:', uploadedFileName);
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
          throw entryError; // Propagate to main catch
        }
        console.log('Contest entry created successfully:', entryResult);
        toast.success('Contest entry submitted successfully! It will be reviewed before appearing publicly.');
        return true;

      } catch (dbError) {
        console.error('Database insert process failed:', dbError);
        // Toast for dbError already handled if it's an entryError, otherwise generic
        if (!dbError.message.includes('duplicate') && !dbError.message.includes('policy')) {
           toast.error(dbError.message || 'Database operation failed.');
        }
        return false; // Return false as the operation failed
      }

    } catch (error: any) {
      // This is the main catch block. Errors from try/catch within video upload or DB insert
      // that are re-thrown will end up here.
      // Specific toasts should have been handled closer to the error source.
      // This provides a generic fallback.
      console.error('Contest submission overall error:', error);
      if (!toast.isActive('upload-error') && !toast.isActive('db-error')) { // Avoid duplicate generic toasts
          toast.error(error.message || 'Failed to submit contest entry due to an unexpected error.');
      }
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
