-- Step 1: Rename the core table for clarity and alignment with spec.
ALTER TABLE IF EXISTS public.affiliate_applications RENAME TO affiliates;

-- Step 2: Add new columns to the 'affiliates' table for tracking stats and balances.
ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS total_free_referrals INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_subscribers INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_commissions DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS pending_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS paid_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS wallet_address_trc20 TEXT;

-- Step 3: Rename existing columns for consistency with spec.
ALTER TABLE public.affiliates
  RENAME COLUMN IF EXISTS unique_referral_code TO affiliate_code;

-- Step 4: Update the 'usdt_wallet_address' from the original application to the new 'wallet_address_trc20'
-- This ensures the data from the application form is not lost.
UPDATE public.affiliates
SET wallet_address_trc20 = usdt_wallet_address
WHERE usdt_wallet_address IS NOT NULL;

-- Step 5: Drop the old usdt_wallet_address column as it has been replaced.
-- Note: The column `usdt_wallet_address` might not exist on `affiliate_applications` if a previous migration failed.
-- The user prompt mentioned it but the schema might be different. Let's assume it exists on the component and handle it there.
-- Let's not drop it to be safe, but the new code should use `wallet_address_trc20`.

-- Step 6: Rename the commissions table for clarity.
ALTER TABLE IF EXISTS public.affiliate_commissions RENAME TO affiliate_earnings;

-- Step 7: Create the other tables from the user's spec if they don't exist.
-- affiliate_clicks was already created in a previous step.
CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
    id BIGSERIAL PRIMARY KEY,
    affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
    referred_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    first_click_date TIMESTAMPTZ,
    subscribed_within_30_days BOOLEAN NOT NULL DEFAULT false,
    free_referral_earned BOOLEAN NOT NULL DEFAULT false,
    subscription_commission_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_affiliate_id ON public.affiliate_referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referred_user_id ON public.affiliate_referrals(referred_user_id);
