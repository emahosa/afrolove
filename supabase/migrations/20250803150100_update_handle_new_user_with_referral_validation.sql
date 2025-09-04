CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  referrer_user_id UUID;
  is_invalid_referral BOOLEAN := FALSE;
  user_device_id TEXT;
  user_ip_address TEXT;
  referral_code_from_meta TEXT;
BEGIN
  -- Extract data from new user object
  user_ip_address := NEW.last_sign_in_ip;
  user_device_id := NEW.raw_user_meta_data->>'device_id';
  referral_code_from_meta := NEW.raw_user_meta_data->>'referral_code';

  -- Find referrer if a referral code is provided
  IF referral_code_from_meta IS NOT NULL THEN
    SELECT user_id INTO referrer_user_id
    FROM public.affiliate_applications
    WHERE unique_referral_code = referral_code_from_meta
    AND status = 'approved';

    -- If a referrer is found, check for duplicate IP or device ID
    IF referrer_user_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE (ip_address = user_ip_address OR device_id = user_device_id)
        AND referrer_id IS NOT NULL
      ) INTO is_invalid_referral;
    END IF;
  END IF;

  -- Create profile
  INSERT INTO public.profiles (id, username, full_name, avatar_url, credits, ip_address, device_id, referrer_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    5, -- Initial credits
    user_ip_address,
    user_device_id,
    CASE WHEN is_invalid_referral THEN NULL ELSE referrer_user_id END
  );

  -- Always assign voter role as default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'voter');

  -- Create default free subscription record
  INSERT INTO public.user_subscriptions (user_id, subscription_type, subscription_status)
  VALUES (NEW.id, 'free', 'inactive');

  RETURN NEW;
END;
$$;
