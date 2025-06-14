
ALTER TABLE public.contests
ADD COLUMN entry_fee INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.contests.entry_fee IS 'The number of credits required to submit an entry to this contest.';
