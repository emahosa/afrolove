
-- Modify the handle_new_user function to correctly populate profiles.username with the user's email
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure that id, email, full_name, avatar_url, and credits are correctly populated.
  -- Use NEW.email for the username field in profiles, assuming username is intended to store the email.
  INSERT INTO public.profiles (id, username, full_name, avatar_url, credits)
  VALUES (
    NEW.id,
    NEW.email, -- Populate profiles.username with the user's actual email
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    5 -- Default starting credits
  );
  
  -- Set default role as voter
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'voter');
  
  -- Create default subscription record
  INSERT INTO public.user_subscriptions (user_id, subscription_type, subscription_status)
  VALUES (NEW.id, 'free', 'inactive');
  
  RETURN NEW;
END;
$function$;
