-- Add submission_type to contests table
ALTER TABLE public.contests
ADD COLUMN submission_type TEXT NOT NULL DEFAULT 'library' CHECK (submission_type IN ('library', 'genre_template'));

-- Add social_link_enabled to contests table
ALTER TABLE public.contests
ADD COLUMN social_link_enabled BOOLEAN NOT NULL DEFAULT false;

-- Add social_link to contest_entries table
ALTER TABLE public.contest_entries
ADD COLUMN social_link TEXT;

-- Add genre_template_id to contest_entries table
ALTER TABLE public.contest_entries
ADD COLUMN genre_template_id UUID REFERENCES public.genre_templates(id);
