-- This migration reverts the `update_user_credits` function to a more robust version.
-- The previous "simplified" version failed silently if a user profile did not exist.
-- This version re-introduces the logic to create a profile if one is not found.
-- It also keeps the SECURITY INVOKER property to prevent RLS issues.

DROP FUNCTION IF EXISTS public.update_user_credits(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.update_user_credits(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER -- Use INVOKER to adopt the permissions of the calling role (service_role)
AS $$
DECLARE
  v_current_credits INTEGER;
  v_new_credits INTEGER;
BEGIN
  -- Log the incoming request for debugging.
  RAISE LOG '[update_user_credits_v2] Updating credits for user % by amount %', p_user_id, p_amount;

  -- First, check if the user profile exists.
  SELECT credits INTO v_current_credits
  FROM public.profiles
  WHERE id = p_user_id;

  -- If profile doesn't exist, create it with the new credits.
  IF v_current_credits IS NULL THEN
    RAISE LOG '[update_user_credits_v2] Profile for user % not found. Creating new profile.', p_user_id;
    INSERT INTO public.profiles (id, credits)
    VALUES (p_user_id, p_amount)
    RETURNING credits INTO v_new_credits;
  ELSE
    -- Otherwise, update the existing profile.
    RAISE LOG '[update_user_credits_v2] Profile found for user %. Updating credits.', p_user_id;
    UPDATE public.profiles
    SET credits = COALESCE(credits, 0) + p_amount
    WHERE id = p_user_id
    RETURNING credits INTO v_new_credits;
  END IF;

  -- Log the result and return the new credit balance.
  RAISE LOG '[update_user_credits_v2] New credit balance for user % is %', p_user_id, v_new_credits;
  RETURN v_new_credits;
END;
$$;

-- Re-grant permissions to the function for service_role, which is used by the webhooks.
GRANT EXECUTE ON FUNCTION public.update_user_credits(UUID, INTEGER) TO service_role;
