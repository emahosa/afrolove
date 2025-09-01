/*
  # Add missing Paystack columns to user_subscriptions

  1. New Columns
    - `paystack_customer_code` (text) - Paystack customer identifier
    - `paystack_subscription_code` (text) - Paystack subscription identifier
    - `payment_provider` (text) - Track which gateway was used ('stripe' or 'paystack')

  2. Indexes
    - Add indexes for the new Paystack columns for better query performance

  3. Security
    - No RLS changes needed as table already has proper policies
*/

-- Add missing columns to user_subscriptions table
DO $$
BEGIN
  -- Add paystack_customer_code column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'paystack_customer_code'
  ) THEN
    ALTER TABLE user_subscriptions ADD COLUMN paystack_customer_code TEXT;
  END IF;

  -- Add paystack_subscription_code column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'paystack_subscription_code'
  ) THEN
    ALTER TABLE user_subscriptions ADD COLUMN paystack_subscription_code TEXT;
  END IF;

  -- Add payment_provider column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'payment_provider'
  ) THEN
    ALTER TABLE user_subscriptions ADD COLUMN payment_provider TEXT DEFAULT 'stripe';
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_paystack_customer 
ON user_subscriptions(paystack_customer_code);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_paystack_subscription 
ON user_subscriptions(paystack_subscription_code);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_payment_provider 
ON user_subscriptions(payment_provider);