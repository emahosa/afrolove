-- Create the contest_winners table
CREATE TABLE public.contest_winners (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    contest_id UUID NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    contest_entry_id UUID NOT NULL REFERENCES public.contest_entries(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL DEFAULT 1,
    won_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX idx_contest_winners_contest_id ON public.contest_winners(contest_id);
CREATE INDEX idx_contest_winners_user_id ON public.contest_winners(user_id);

-- Enable Row Level Security
ALTER TABLE public.contest_winners ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contest_winners
CREATE POLICY "Public can view all contest winners"
ON public.contest_winners
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage contest winners"
ON public.contest_winners
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
