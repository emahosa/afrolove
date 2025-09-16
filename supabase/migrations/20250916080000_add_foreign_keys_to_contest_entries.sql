-- In this migration, we are adding two foreign key constraints to the contest_entries table.
-- 1. A foreign key from contest_entries.user_id to profiles.id. This ensures that every contest entry is associated with a valid user. If a user is deleted, all their contest entries will be deleted as well (ON DELETE CASCADE).
-- 2. A foreign key from contest_entries.song_id to songs.id. This ensures that every contest entry is linked to a valid song. If a song is deleted, the song_id in the contest_entries table will be set to NULL (ON DELETE SET NULL), preserving the entry without a direct song link.

-- Add foreign key for user_id to profiles
-- This links the contest entry to a user profile.
ALTER TABLE public.contest_entries
ADD CONSTRAINT fk_contest_entries_user_id
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- Add foreign key for song_id to songs
-- This links the contest entry to a specific song.
-- If the song is deleted, the link is set to NULL to preserve the entry.
ALTER TABLE public.contest_entries
ADD CONSTRAINT fk_contest_entries_song_id
FOREIGN KEY (song_id)
REFERENCES public.songs(id)
ON DELETE SET NULL;
