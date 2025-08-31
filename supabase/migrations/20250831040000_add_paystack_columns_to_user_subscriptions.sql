/*
  # Add Paystack columns to user_subscriptions table

  1. New Columns
    - `paystack_customer_code` (text) - Paystack customer identifier
    - `paystack_subscription_code` (text) - Paystack subscription identifier
    - `payment_provider` (text) - Track which payment provider was used

  2. Indexes
    - Add indexes for the new Paystack columns for better query performance

  3. Notes
    - These columns are nullable to maintain compatibility with existing Stripe subscriptions
    - The payment_provider column helps distinguish between Stripe and Paystack subscriptions
*/

-- Add Paystack-specific columns to user_subscriptions table
DO $$
BEGIN
  -- Add paystack_customer_code column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'paystack_customer_code'
  ) THEN
    ALTER TABLE public.user_subscriptions 
    ADD COLUMN paystack_customer_code TEXT;
  END IF;

  -- Add paystack_subscription_code column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'paystack_subscription_code'
  ) THEN
    ALTER TABLE public.user_subscriptions 
    ADD COLUMN paystack_subscription_code TEXT;
  END IF;

  -- Add payment_provider column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'payment_provider'
  ) THEN
    ALTER TABLE public.user_subscriptions 
    ADD COLUMN payment_provider TEXT DEFAULT 'stripe';
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_paystack_customer 
ON public.user_subscriptions(paystack_customer_code);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_paystack_subscription 
ON public.user_subscriptions(paystack_subscription_code);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_payment_provider 
ON public.user_subscriptions(payment_provider);

-- Add unique constraint for paystack_subscription_code (similar to stripe_subscription_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_subscriptions_paystack_subscription_code_key'
  ) THEN
    ALTER TABLE public.user_subscriptions 
    ADD CONSTRAINT user_subscriptions_paystack_subscription_code_key 
    UNIQUE (paystack_subscription_code);
  END IF;
END $$;
