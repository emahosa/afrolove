-- Add columns for vocal separation
ALTER TABLE public.songs ADD COLUMN audio_id TEXT;
ALTER TABLE public.songs ADD COLUMN instrumental_url TEXT;
ALTER TABLE public.songs ADD COLUMN vocal_url TEXT;
ALTER TABLE public.songs ADD COLUMN vocal_separation_status TEXT DEFAULT 'not_started';

-- Add indexes for faster lookups
CREATE INDEX songs_audio_id_idx ON public.songs (audio_id);
