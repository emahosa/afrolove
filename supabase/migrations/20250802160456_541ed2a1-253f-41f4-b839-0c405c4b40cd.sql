
-- Add the missing columns to user_subscriptions table if they don't exist
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add a unique constraint to stripe_subscription_id as it's a primary key in Stripe
-- and should uniquely identify a subscription in our system as well.
-- Only add if the column is newly added or doesn't have this constraint yet.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_stripe_subscription_id'
    AND conrelid = 'public.user_subscriptions'::regclass
  ) THEN
    ALTER TABLE public.user_subscriptions
    ADD CONSTRAINT uq_stripe_subscription_id UNIQUE (stripe_subscription_id);
  END IF;
END;
$$;

-- Add an index for faster lookups, if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_stripe_customer_id ON public.user_subscriptions (stripe_customer_id);
