
-- Add credit_cost column to contests table
ALTER TABLE public.contests 
ADD COLUMN credit_cost integer NOT NULL DEFAULT 1;

-- Add comment to explain the column
COMMENT ON COLUMN public.contests.credit_cost IS 'Credits required to unlock and participate in this contest';
