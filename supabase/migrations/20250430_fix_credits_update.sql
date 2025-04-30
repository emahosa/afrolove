
-- Create an RPC function that will handle credit updates with proper permissions
CREATE OR REPLACE FUNCTION public.update_user_credits(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER -- This is crucial as it runs with the privileges of the function creator
SET search_path = public
AS $$
DECLARE
  v_current_credits INTEGER;
  v_new_credits INTEGER;
BEGIN
  -- First check if the user profile exists
  SELECT credits INTO v_current_credits
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- If profile doesn't exist, create it with default values
  IF v_current_credits IS NULL THEN
    INSERT INTO public.profiles (id, credits)
    VALUES (p_user_id, p_amount)
    RETURNING credits INTO v_new_credits;
    
    -- Also insert a record in user_roles if it doesn't exist
    BEGIN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (p_user_id, 'user')
      ON CONFLICT (user_id, role) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      -- Ignore errors from user_roles insertion
      NULL;
    END;
  ELSE
    -- Update existing profile
    UPDATE public.profiles
    SET credits = credits + p_amount
    WHERE id = p_user_id
    RETURNING credits INTO v_new_credits;
  END IF;
  
  -- Also log the transaction (separate from the credits update)
  BEGIN
    INSERT INTO public.credit_transactions (
      user_id,
      amount,
      transaction_type,
      description
    ) VALUES (
      p_user_id,
      p_amount,
      CASE WHEN p_amount > 0 THEN 'credit' ELSE 'debit' END,
      CASE WHEN p_amount > 0 THEN 'Credits added' ELSE 'Credits used' END
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log transaction error but don't fail the whole operation
    NULL;
  END;
  
  RETURN v_new_credits;
END;
$$;

-- Ensure proper permissions for the RPC function
GRANT EXECUTE ON FUNCTION public.update_user_credits TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_credits TO service_role;

-- Setup proper RLS for profiles table
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for the profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE
  USING (auth.uid() = id);

-- Setup proper RLS for credit_transactions table
ALTER TABLE IF EXISTS public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for the credit_transactions table
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.credit_transactions;
CREATE POLICY "Users can view their own transactions" 
  ON public.credit_transactions 
  FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.credit_transactions;
CREATE POLICY "Users can insert their own transactions" 
  ON public.credit_transactions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
