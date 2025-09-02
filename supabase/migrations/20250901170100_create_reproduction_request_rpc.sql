-- RPC to create a new track reproduction request
CREATE OR REPLACE FUNCTION public.create_reproduction_request(
    p_producer_id uuid,
    p_original_track_url text,
    p_user_vocal_recording_url text,
    p_price_in_credits integer
)
RETURNS uuid -- Return the ID of the new request
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_user_credits integer;
    v_new_request_id uuid;
BEGIN
    -- Ensure the user is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to create a request';
    END IF;

    -- 1. Get user's current credit balance
    SELECT credits INTO v_user_credits
    FROM public.profiles
    WHERE id = v_user_id;

    -- 2. Check if user has enough credits
    IF v_user_credits IS NULL OR v_user_credits < p_price_in_credits THEN
        RAISE EXCEPTION 'Insufficient credits';
    END IF;

    -- 3. Deduct credits from user's profile
    UPDATE public.profiles
    SET credits = credits - p_price_in_credits
    WHERE id = v_user_id;

    -- 4. Insert into reproduction_requests
    INSERT INTO public.reproduction_requests (
        user_id,
        producer_id,
        original_track_url,
        user_vocal_recording_url,
        price_in_credits
    )
    VALUES (
        v_user_id,
        p_producer_id,
        p_original_track_url,
        p_user_vocal_recording_url,
        p_price_in_credits
    )
    RETURNING id INTO v_new_request_id;

    -- 5. Insert into credit_escrow
    INSERT INTO public.credit_escrow (
        request_id,
        user_id,
        producer_id,
        amount,
        status
    )
    VALUES (
        v_new_request_id,
        v_user_id,
        p_producer_id,
        p_price_in_credits,
        'held'
    );

    RETURN v_new_request_id;
END;
$$;
