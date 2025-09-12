-- Add a foreign key constraint to the winner_claim_details table
ALTER TABLE public.winner_claim_details
ADD CONSTRAINT fk_contest
FOREIGN KEY (contest_id)
REFERENCES public.contests(id)
ON DELETE CASCADE;
