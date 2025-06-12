
-- Remove the credit_cost column from contests table (revert the credit system migration)
ALTER TABLE public.contests DROP COLUMN IF EXISTS credit_cost;
