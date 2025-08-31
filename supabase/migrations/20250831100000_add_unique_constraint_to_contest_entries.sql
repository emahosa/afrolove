ALTER TABLE public.contest_entries
ADD CONSTRAINT contest_entries_user_id_contest_id_key UNIQUE (user_id, contest_id);
