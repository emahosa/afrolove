
-- Add missing usdt_wallet_address column to affiliate_applications table
ALTER TABLE public.affiliate_applications 
ADD COLUMN IF NOT EXISTS usdt_wallet_address text;

-- Update the RLS policy to include the new column
UPDATE public.affiliate_applications SET usdt_wallet_address = '' WHERE usdt_wallet_address IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE public.affiliate_applications 
ALTER COLUMN usdt_wallet_address SET NOT NULL;

-- Ensure contest_entries table has proper permissions
-- The error suggests there might be an RLS policy referencing the auth.users table directly
-- Let's check and fix any problematic policies

-- Drop any problematic RLS policies that might be causing issues
DROP POLICY IF EXISTS "contest_entries_user_check_policy" ON public.contest_entries;

-- Create a proper policy for contest entries that doesn't reference auth.users directly
CREATE POLICY "Users can create contest entries" 
ON public.contest_entries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Ensure system_settings table exists and has proper structure
CREATE TABLE IF NOT EXISTS public.system_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text NOT NULL UNIQUE,
    value jsonb NOT NULL,
    category text NOT NULL DEFAULT 'general',
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);

-- Enable RLS on system_settings if not already enabled
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for system_settings
DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;
CREATE POLICY "Admins can manage system settings" 
ON public.system_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'::user_role
  ) OR auth.uid() = '1a7e4d46-b4f2-464e-a1f4-2766836286c1'::uuid
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'::user_role
  ) OR auth.uid() = '1a7e4d46-b4f2-464e-a1f4-2766836286c1'::uuid
);
