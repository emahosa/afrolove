-- RPC for a producer to respond to a request
CREATE OR REPLACE FUNCTION public.respond_to_reproduction_request(
    p_request_id uuid,
    p_response text -- 'accepted' or 'declined'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_producer_id uuid := auth.uid();
    v_request_status public.reproduction_request_status;
    v_new_status public.reproduction_request_status;
BEGIN
    -- Check if user is a producer
    IF NOT public.has_role('producer') THEN
        RAISE EXCEPTION 'Only producers can respond to requests';
    END IF;

    -- Check if the request is assigned to this producer
    SELECT status INTO v_request_status
    FROM public.reproduction_requests
    WHERE id = p_request_id AND producer_id = v_producer_id;

    IF v_request_status IS NULL THEN
        RAISE EXCEPTION 'Request not found or not assigned to you';
    END IF;

    -- Check if the request is in the correct state
    IF v_request_status <> 'pending_producer_acceptance' THEN
        RAISE EXCEPTION 'This request has already been responded to';
    END IF;

    -- Determine the new status
    IF p_response = 'accepted' THEN
        v_new_status := 'in_progress';
    ELSIF p_response = 'declined' THEN
        v_new_status := 'rejected_by_producer';
    ELSE
        RAISE EXCEPTION 'Invalid response. Must be "accepted" or "declined"';
    END IF;

    -- Update the request status
    UPDATE public.reproduction_requests
    SET status = v_new_status
    WHERE id = p_request_id;

    -- If declined, refund the credits from escrow
    IF v_new_status = 'rejected_by_producer' THEN
        DECLARE
            v_escrow_record public.credit_escrow;
        BEGIN
            -- Find the escrow record
            SELECT * INTO v_escrow_record
            FROM public.credit_escrow
            WHERE request_id = p_request_id AND status = 'held';

            IF v_escrow_record IS NOT NULL THEN
                -- Refund credits to the user
                UPDATE public.profiles
                SET credits = credits + v_escrow_record.amount
                WHERE id = v_escrow_record.user_id;

                -- Update escrow status
                UPDATE public.credit_escrow
                SET status = 'refunded'
                WHERE id = v_escrow_record.id;
            END IF;
        END;
    END IF;

END;
$$;

-- RPC for a producer to submit the final track
CREATE OR REPLACE FUNCTION public.submit_final_track(
    p_request_id uuid,
    p_final_track_url text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_producer_id uuid := auth.uid();
BEGIN
    -- Check if user is a producer
    IF NOT public.has_role('producer') THEN
        RAISE EXCEPTION 'Only producers can submit tracks';
    END IF;

    -- Update the request with the final track URL and set status to 'pending_user_review'
    UPDATE public.reproduction_requests
    SET
        final_track_url = p_final_track_url,
        status = 'pending_user_review'
    WHERE
        id = p_request_id
        AND producer_id = v_producer_id
        AND status IN ('in_progress', 'revision_requested');
END;
$$;
