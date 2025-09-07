import { supabase } from '@/integrations/supabase/client';

let setupPromise: Promise<void> | null = null;

export const ensureStorageBuckets = (): Promise<void> => {
  if (!setupPromise) {
    setupPromise = (async () => {
      try {
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();

        if (listError) {
          console.error('Error listing buckets:', listError);
          setupPromise = null; // Reset promise to allow retry
          throw listError;
        }

        const contestBucketExists = buckets?.some(bucket => bucket.name === 'contest-videos');
        const siteContentBucketExists = buckets?.some(bucket => bucket.name === 'site-content');

        if (!contestBucketExists) {
          const { error: createError } = await supabase.storage.createBucket('contest-videos', {
            public: true,
            allowedMimeTypes: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'],
            fileSizeLimit: 50 * 1024 * 1024 // 50MB
          });

          if (createError && !createError.message.includes('already exists')) {
            console.error('Error creating contest-videos bucket:', createError);
            setupPromise = null; // Reset promise to allow retry
            throw createError;
          }
        }

        if (!siteContentBucketExists) {
          const { error: createError } = await supabase.storage.createBucket('site-content', {
            public: true,
            allowedMimeTypes: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'image/jpeg', 'image/png', 'image/webp'],
            fileSizeLimit: 50 * 1024 * 1024 // 50MB for hero videos
          });

          if (createError && !createError.message.includes('already exists')) {
            console.error('Error creating site-content bucket:', createError);
            setupPromise = null; // Reset promise to allow retry
            throw createError;
          }
        }
      } catch (error) {
        console.error('Error in ensureStorageBuckets:', error);
        setupPromise = null; // Reset promise to allow retry
        throw error; // Re-throw to let the caller know it failed
      }
    })();
  }

  return setupPromise;
};
