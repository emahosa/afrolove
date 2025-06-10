
-- Create contest_votes table for voting functionality
CREATE TABLE public.contest_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id uuid NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  contest_entry_id uuid NOT NULL REFERENCES public.contest_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  voter_phone text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.contest_votes ENABLE ROW LEVEL SECURITY;

-- Users can view their own votes
CREATE POLICY "Users can view their own votes" 
  ON public.contest_votes 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can create votes
CREATE POLICY "Users can create votes" 
  ON public.contest_votes 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Prevent duplicate votes per user per contest
CREATE UNIQUE INDEX contest_votes_user_contest_unique 
  ON public.contest_votes (user_id, contest_id);

-- Add trigger to update vote count
CREATE TRIGGER update_contest_entry_vote_count_trigger
  AFTER INSERT OR DELETE ON public.contest_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_contest_entry_vote_count();
