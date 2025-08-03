-- Add ip_address and device_id to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS device_id TEXT;

-- Add setting for free tier affiliate earnings
INSERT INTO public.system_settings (key, value, description, category)
VALUES ('is_free_tier_active', 'true', 'Enable or disable earnings for free tier referrals', 'affiliate')
ON CONFLICT (key) DO NOTHING;
