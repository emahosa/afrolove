
-- Add new columns to the songs table to store more data from Suno API
ALTER TABLE public.songs ADD COLUMN task_id TEXT;
ALTER TABLE public.songs ADD COLUMN suno_id TEXT;
ALTER TABLE public.songs ADD COLUMN image_url TEXT;
ALTER TABLE public.songs ADD COLUMN tags TEXT;
ALTER TABLE public.songs ADD COLUMN model_name TEXT;
ALTER TABLE public.songs ADD COLUMN error_message TEXT;

-- Make the audio_url column nullable, as it will be populated later by the webhook
ALTER TABLE public.songs ALTER COLUMN audio_url DROP NOT NULL;

-- Add a unique constraint to prevent duplicate song entries from the webhook
ALTER TABLE public.songs ADD CONSTRAINT songs_suno_id_key UNIQUE (suno_id);

-- Add indexes for faster lookups on task_id and user queries
CREATE INDEX songs_task_id_idx ON public.songs (task_id);
CREATE INDEX songs_user_id_status_idx ON public.songs (user_id, status);

-- This command is for migrating any existing pending songs to use the new task_id column.
-- It copies the task ID from the audio_url where it was previously stored.
UPDATE public.songs SET task_id = audio_url WHERE status = 'pending' AND audio_url IS NOT NULL AND audio_url NOT LIKE 'http%';

