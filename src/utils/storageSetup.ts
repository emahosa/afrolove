import { supabase } from '@/integrations/supabase/client';

let isBucketCheckRunning = false;
let bucketsChecked = false;

const bucketsToEnsure = [
  {
    name: 'contest-videos',
    options: {
      public: true,
      allowedMimeTypes: ['video/mp4', 'video/quicktime', 'video/x-ms-wmv', 'video/x-matroska', 'video/avi', 'audio/mpeg', 'audio/wav'],
      fileSizeLimit: 50 * 1024 * 1024, // 50MB
    },
  },
  {
    name: 'instrumentals',
    options: {
      public: true,
      allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
      fileSizeLimit: 50 * 1024 * 1024, // 50MB
    },
  },
  {
    name: 'site-content',
    options: {
      public: true,
      allowedMimeTypes: ['video/mp4', 'image/jpeg', 'image/png', 'image/gif'],
      fileSizeLimit: 50 * 1024 * 1024, // 50MB
    },
  },
];

export const ensureStorageBuckets = async () => {
  if (bucketsChecked || isBucketCheckRunning) {
    return;
  }
  isBucketCheckRunning = true;

  try {
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.error('Error listing buckets:', listError);
      // Avoid retrying on every render if permissions are wrong.
      bucketsChecked = true;
      return;
    }

    const existingBucketNames = new Set(existingBuckets.map(b => b.name));

    for (const bucket of bucketsToEnsure) {
      if (!existingBucketNames.has(bucket.name)) {
        console.log(`Bucket "${bucket.name}" not found. Creating...`);
        const { error: createError } = await supabase.storage.createBucket(bucket.name, bucket.options);
        if (createError) {
          // It's possible another process created the bucket in the meantime (race condition).
          if (createError.message.includes('The resource already exists')) {
            console.warn(`Bucket "${bucket.name}" was created by another process during check. Continuing...`);
          } else {
            console.error(`Error creating bucket "${bucket.name}":`, createError);
          }
        } else {
          console.log(`Bucket "${bucket.name}" created successfully.`);
        }
      }
    }

    bucketsChecked = true;
  } catch (error) {
    console.error('Error in ensureStorageBuckets:', error);
  } finally {
    isBucketCheckRunning = false;
  }
};
