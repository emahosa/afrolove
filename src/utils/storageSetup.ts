
import { supabase } from '@/integrations/supabase/client';

export const ensureStorageBuckets = async () => {
  try {
    // Check if contest-videos bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }

    const requiredBuckets = [
      {
        name: 'contest-videos',
        options: {
          public: true,
          allowedMimeTypes: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'],
          fileSizeLimit: 50 * 1024 * 1024 // 50MB
        }
      },
      {
        name: 'site-content',
        options: {
          public: true,
          fileSizeLimit: 50 * 1024 * 1024 // 50MB
        }
      }
    ];

    for (const bucket of requiredBuckets) {
      const bucketExists = buckets?.some(b => b.name === bucket.name);
      if (!bucketExists) {
        const { error: createError } = await supabase.storage.createBucket(bucket.name, bucket.options);
        if (createError) {
          // In a concurrent environment, another instance might have created the bucket.
          // We can safely ignore this specific error.
          if (createError.message.includes('The resource already exists')) {
             console.log(`Bucket ${bucket.name} already exists. No action needed.`);
          } else {
            console.error(`Error creating ${bucket.name} bucket:`, createError);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in ensureStorageBuckets:', error);
  }
};
