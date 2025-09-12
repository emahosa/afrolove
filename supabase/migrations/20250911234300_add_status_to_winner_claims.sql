-- Add a new 'status' column to the winner_claim_details table
ALTER TABLE public.winner_claim_details
ADD COLUMN status TEXT NOT NULL DEFAULT 'Pending';

-- Backfill the 'status' column based on the old boolean flags
UPDATE public.winner_claim_details
SET status = CASE
  WHEN prize_claimed = TRUE THEN 'Fulfilled'
  WHEN admin_reviewed = TRUE THEN 'Processing'
  ELSE 'Pending'
END;

-- Remove the old boolean columns
ALTER TABLE public.winner_claim_details
DROP COLUMN admin_reviewed,
DROP COLUMN prize_claimed;

-- Add a check constraint to ensure the status can only be one of the allowed values
ALTER TABLE public.winner_claim_details
ADD CONSTRAINT winner_claim_details_status_check CHECK (status IN ('Pending', 'Processing', 'Fulfilled'));
