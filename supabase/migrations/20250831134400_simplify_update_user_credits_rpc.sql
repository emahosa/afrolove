-- Drop the old function to ensure a clean slate.
DROP FUNCTION IF EXISTS public.update_user_credits(UUID, INTEGER);

-- Create a new, simplified version of the function.
CREATE OR REPLACE FUNCTION public.update_user_credits(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_credits INTEGER;
BEGIN
  -- Log the incoming request for debugging. This will appear in the Supabase logs.
  RAISE LOG '[update_user_credits] Updating credits for user % by amount %', p_user_id, p_amount;

  -- Update the profile's credits, ensuring we don't go below zero if that's a concern.
  -- Using COALESCE to handle cases where credits might be NULL.
  UPDATE public.profiles
  SET credits = COALESCE(credits, 0) + p_amount
  WHERE id = p_user_id
  RETURNING credits INTO v_new_credits;

  -- Log the result.
  RAISE LOG '[update_user_credits] New credit balance for user % is %', p_user_id, v_new_credits;

  -- Return the new credit balance.
  RETURN v_new_credits;
END;
$$;

-- Re-grant permissions to the function.
GRANT EXECUTE ON FUNCTION public.update_user_credits(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_credits(UUID, INTEGER) TO service_role;
