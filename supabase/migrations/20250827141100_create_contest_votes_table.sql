-- Create the new table for tracking contest votes with details
CREATE TABLE public.contest_votes (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    contest_id UUID NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
    contest_entry_id UUID NOT NULL REFERENCES public.contest_entries(id) ON DELETE CASCADE,
    num_votes INTEGER NOT NULL CHECK (num_votes > 0),
    credits_spent INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_can_only_have_one_free_vote_per_contest UNIQUE (user_id, contest_id, credits_spent)
);

-- Add a column to contest_entries to help with sorting by recent activity
ALTER TABLE public.contest_entries
ADD COLUMN last_voted_at TIMESTAMPTZ DEFAULT NOW();

-- Create an index for faster lookups
CREATE INDEX idx_contest_votes_user_contest ON public.contest_votes(user_id, contest_id);

-- Enable Row Level Security
ALTER TABLE public.contest_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contest_votes
CREATE POLICY "Users can view their own votes"
ON public.contest_votes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own votes"
ON public.contest_votes
FOR INSERT
WITH CHECK (auth.uid() = user_id);
