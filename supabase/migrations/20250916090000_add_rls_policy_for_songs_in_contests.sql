-- In this migration, we are adding a new Row Level Security (RLS) policy to the `songs` table.
-- This policy allows users to view songs that are part of an approved contest entry.
-- This is necessary for the contest entries page to be able to display and play songs from different users.
-- The existing RLS policy for songs likely only allows users to see their own songs.
-- This new policy expands that permission in a controlled way, only for the context of a contest.

CREATE POLICY "Allow users to view songs in approved contest entries"
ON public.songs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.contest_entries
    WHERE contest_entries.song_id = songs.id
    AND contest_entries.approved = true
  )
);
