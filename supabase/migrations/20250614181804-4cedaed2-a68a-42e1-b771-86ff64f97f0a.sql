
-- Create a table to track which users have unlocked which contests
CREATE TABLE public.unlocked_contests (
    user_id UUID NOT NULL,
    contest_id UUID NOT NULL,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, contest_id)
);

-- Add foreign key constraints with cascade delete
ALTER TABLE public.unlocked_contests 
ADD CONSTRAINT unlocked_contests_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.unlocked_contests 
ADD CONSTRAINT unlocked_contests_contest_id_fkey 
FOREIGN KEY (contest_id) REFERENCES public.contests(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE public.unlocked_contests ENABLE ROW LEVEL SECURITY;

-- Policies for RLS
CREATE POLICY "Users can view their own unlocked contests"
ON public.unlocked_contests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own unlocked contests"
ON public.unlocked_contests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own unlocked records"
ON public.unlocked_contests
FOR DELETE
USING (auth.uid() = user_id);

