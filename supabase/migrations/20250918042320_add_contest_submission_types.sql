-- Create the enum type for contest submission
CREATE TYPE public.contest_submission_type AS ENUM ('user_library', 'genre_template');

-- Add the submission_type column to the contests table
ALTER TABLE public.contests
ADD COLUMN submission_type public.contest_submission_type NOT NULL DEFAULT 'user_library';

-- Add the social_link_enabled column to the contests table
ALTER TABLE public.contests
ADD COLUMN social_link_enabled BOOLEAN NOT NULL DEFAULT false;

-- Add the social_link column to the contest_entries table
ALTER TABLE public.contest_entries
ADD COLUMN social_link TEXT;
