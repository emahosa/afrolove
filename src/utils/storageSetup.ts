import { supabase } from '@/integrations/supabase/client';

let storageSetupCompleted = false;

export const ensureStorageBuckets = async () => {
  if (storageSetupCompleted) {
    return;
  }
  storageSetupCompleted = true;

  try {
    // Check if contest-videos bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      storageSetupCompleted = false; // Allow retry on error
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
        console.error('Error creating contest-videos bucket:', createError);
        storageSetupCompleted = false; // Allow retry on error
      }
    }
  } catch (error) {
    console.error('Error in ensureStorageBuckets:', error);
    storageSetupCompleted = false; // Allow retry on error
  }
};
