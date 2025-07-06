
import { supabase } from "@/integrations/supabase/client";

export const ensureStorageBuckets = async () => {
  try {
    // Check if contest-videos bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }

    const contestVideosBucket = buckets?.find(bucket => bucket.name === 'contest-videos');
    
    if (!contestVideosBucket) {
      console.log('Creating contest-videos bucket...');
      console.log('Attempting to create contest-videos bucket with a 50MB file size limit.');
      const { error: createError } = await supabase.storage.createBucket('contest-videos', {
        public: true,
        allowedMimeTypes: ['video/*'], // Standard MIME types for video
        fileSizeLimit: 50 * 1024 * 1024  // Reduced to 50MB limit
      });
      
      if (createError) {
        console.error('Error creating contest-videos bucket (50MB attempt):', createError);
        // As a fallback, try creating with no size/type options if the previous failed.
        // This helps determine if the options themselves are the sole cause of failure.
        console.log('Attempting to create contest-videos bucket with default options as a fallback...');
        const { error: fallbackError } = await supabase.storage.createBucket('contest-videos', {
          public: true, // Keep it public, as likely intended
        });
        if (fallbackError) {
          console.error('Error creating contest-videos bucket (fallback attempt with default options):', fallbackError);
        } else {
          console.log('Contest-videos bucket created successfully with default options (public). Please configure file size limits and MIME types in Supabase dashboard if needed.');
        }
        console.error('Error creating contest-videos bucket:', createError);
      } else {
        console.log('Contest-videos bucket created successfully');
      }
    }
  } catch (error) {
    console.error('Error in ensureStorageBuckets:', error);
  }
};
