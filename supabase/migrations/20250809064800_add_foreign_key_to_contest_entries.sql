-- This migration adds the missing foreign key relationship between the
-- contest_entries table and the profiles table. This is necessary to
-- resolve the "Could not find a relationship" error when querying
-- contest entries and joining with user profiles.

ALTER TABLE public.contest_entries
ADD CONSTRAINT contest_entries_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;
