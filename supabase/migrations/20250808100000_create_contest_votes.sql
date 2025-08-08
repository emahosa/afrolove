-- Create contest_votes table
CREATE TABLE IF NOT EXISTS public.contest_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id),
  contest_id uuid NOT NULL REFERENCES public.contests(id),
  contest_entry_id uuid NOT NULL REFERENCES public.contest_entries(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_contest_vote UNIQUE (user_id, contest_id)
);

-- Add RLS to the new table
ALTER TABLE public.contest_votes ENABLE ROW LEVEL SECURITY;

-- Policies for contest_votes
CREATE POLICY "Users can view their own votes" ON public.contest_votes
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own votes" ON public.contest_votes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all votes" ON public.contest_votes
  FOR ALL USING (has_role('admin'::user_role));

-- RPC function to handle voting logic
CREATE OR REPLACE FUNCTION public.handle_contest_vote(p_entry_id uuid, p_user_id uuid, p_contest_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  vote_cost int := 5;
  user_credits int;
  has_voted_before boolean;
BEGIN
  -- Check if the user has already voted in this contest
  SELECT EXISTS (
    SELECT 1 FROM public.contest_votes WHERE user_id = p_user_id AND contest_id = p_contest_id
  ) INTO has_voted_before;

  IF has_voted_before THEN
    -- This is a subsequent (paid) vote
    -- Check user credits
    SELECT credits INTO user_credits FROM public.profiles WHERE id = p_user_id;

    IF user_credits < vote_cost THEN
      RETURN json_build_object('error', 'Insufficient credits for extra vote. You need 5 credits.');
    END IF;

    -- Deduct credits
    UPDATE public.profiles SET credits = credits - vote_cost WHERE id = p_user_id;

  ELSE
    -- This is the first (free) vote
    INSERT INTO public.contest_votes (user_id, contest_id, contest_entry_id)
    VALUES (p_user_id, p_contest_id, p_entry_id);
  END IF;

  -- Increment vote count for the entry
  UPDATE public.contest_entries
  SET vote_count = vote_count + 1
  WHERE id = p_entry_id;

  RETURN json_build_object('success', true, 'message', 'Vote cast successfully!');
END;
$$;
