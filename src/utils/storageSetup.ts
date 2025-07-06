
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
      const { error: createError } = await supabase.storage.createBucket('contest-videos', {
        public: true,
        allowedMimeTypes: ['video/*'],
        fileSizeLimit: 100 * 1024 * 1024 // 100MB limit
      });
      
      if (createError) {
        console.error('Error creating contest-videos bucket:', createError);
      } else {
        console.log('Contest-videos bucket created successfully');
      }
    }
  } catch (error) {
    console.error('Error in ensureStorageBuckets:', error);
  }
};
