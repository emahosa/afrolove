
import { supabase } from '@/integrations/supabase/client';

export const ensureStorageBuckets = async () => {
  try {
    // Check if contest-videos bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const contestVideosBucket = buckets?.find(bucket => bucket.name === 'contest-videos');
    
    if (!contestVideosBucket) {
      console.log('Creating contest-videos bucket...');
      const { error } = await supabase.storage.createBucket('contest-videos', {
        public: true
      });
      
      if (error) {
        console.error('Error creating contest-videos bucket:', error);
      } else {
        console.log('Contest-videos bucket created successfully');
      }
    }
  } catch (error) {
    console.error('Error ensuring storage buckets:', error);
  }
};
