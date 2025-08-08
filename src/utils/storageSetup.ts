
import { supabase } from '@/integrations/supabase/client';

export const ensureStorageBuckets = async () => {
  try {
    // Check if contest-videos bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      // If listing buckets fails, it's likely due to permissions.
      // In this case, we can't check if the bucket exists.
      // We will assume it does and not try to create it, to avoid the RLS error.
      console.warn('Could not list buckets, assuming contest-videos bucket exists.', listError);
      return;
    }

    const contestBucketExists = buckets?.some(bucket => bucket.name === 'contest-videos');
    
    if (!contestBucketExists) {
      const { error: createError } = await supabase.storage.createBucket('contest-videos', {
        public: true,
        allowedMimeTypes: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'],
        fileSizeLimit: 50 * 1024 * 1024 // 50MB
      });
      
      if (createError) {
        // This will still fail if the user doesn't have permission to create buckets.
        // But at least we are only trying it when we are sure the bucket doesn't exist (according to the list).
        console.error('Error creating contest-videos bucket:', createError);
      }
    }
  } catch (error) {
    console.error('Error in ensureStorageBuckets:', error);
  }
};
