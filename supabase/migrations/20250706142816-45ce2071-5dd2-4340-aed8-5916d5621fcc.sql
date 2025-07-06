
-- Add audio preview and cover image fields to genres table
ALTER TABLE public.genres 
ADD COLUMN IF NOT EXISTS audio_preview_url TEXT,
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS sample_prompt TEXT;

-- Update existing genres to have sample prompts if needed
UPDATE public.genres 
SET sample_prompt = 'Create a song in ' || name || ' style' 
WHERE sample_prompt IS NULL AND is_active = true;
