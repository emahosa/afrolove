-- Function to generate a random string for affiliate codes
CREATE OR REPLACE FUNCTION generate_random_string(length integer)
RETURNS text AS $$
DECLARE
  chars text[] := '{A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z,0,1,2,3,4,5,6,7,8,9}';
  result text := '';
  i integer := 0;
BEGIN
  FOR i IN 1..length LOOP
    result := result || chars[1+random()*(array_length(chars, 1)-1)];
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- RPC to approve an application
CREATE OR REPLACE FUNCTION approve_affiliate_application(p_application_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Important: runs with the privileges of the function owner
AS $$
DECLARE
  v_user_id uuid;
  v_affiliate_code text;
BEGIN
  -- Check if caller is an admin
  IF NOT is_claims_admin() THEN
    RAISE EXCEPTION 'You must be an admin to perform this action.';
  END IF;

  -- 1. Get the user_id from the application
  SELECT user_id INTO v_user_id FROM public.affiliate_applications WHERE id = p_application_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Application not found.';
  END IF;

  -- Check if user is already an affiliate
  IF EXISTS (SELECT 1 FROM public.affiliates WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'This user is already an affiliate.';
  END IF;

  -- 2. Generate a unique affiliate code
  LOOP
    v_affiliate_code := 'AFF' || generate_random_string(6);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.affiliates WHERE code = v_affiliate_code);
  END LOOP;

  -- 3. Insert into the affiliates table
  INSERT INTO public.affiliates (user_id, code, status, approved_at)
  VALUES (v_user_id, v_affiliate_code, 'approved', now());

  -- 4. Update the application status
  UPDATE public.affiliate_applications
  SET
    status = 'approved',
    reviewed_at = now(),
    reviewer_id = auth.uid()
  WHERE id = p_application_id;

END;
$$;

-- RPC to reject an application
CREATE OR REPLACE FUNCTION reject_affiliate_application(p_application_id uuid, p_rejection_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is an admin
  IF NOT is_claims_admin() THEN
    RAISE EXCEPTION 'You must be an admin to perform this action.';
  END IF;

  -- Update the application status and set reapply date
  UPDATE public.affiliate_applications
  SET
    status = 'rejected',
    rejection_reason = p_rejection_reason,
    reviewed_at = now(),
    reviewer_id = auth.uid(),
    can_reapply_after = now() + interval '30 days'
  WHERE id = p_application_id;

END;
$$;
