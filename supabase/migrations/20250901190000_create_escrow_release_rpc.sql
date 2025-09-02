-- Table to log platform earnings for accounting
CREATE TABLE public.platform_earnings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    source_request_id uuid NOT NULL REFERENCES public.reproduction_requests(id),
    amount_credits integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT platform_earnings_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.platform_earnings IS 'Logs the platform''s commission from completed reproduction requests.';

-- RLS for platform_earnings
ALTER TABLE public.platform_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage platform earnings"
ON public.platform_earnings FOR ALL
USING (public.is_admin(auth.uid()));


-- RPC for a user to review a submitted final track
CREATE OR REPLACE FUNCTION public.review_final_track(
    p_request_id uuid,
    p_review_action text -- 'accepted' or 'revision_requested'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_request public.reproduction_requests;
    v_escrow public.credit_escrow;
    v_producer_payout integer;
    v_platform_commission integer;
BEGIN
    -- Get the request details
    SELECT * INTO v_request
    FROM public.reproduction_requests
    WHERE id = p_request_id AND user_id = v_user_id;

    -- Validate
    IF v_request IS NULL THEN
        RAISE EXCEPTION 'Request not found or you do not have permission to review it.';
    END IF;
    IF v_request.status <> 'pending_user_review' THEN
        RAISE EXCEPTION 'This track is not currently pending review.';
    END IF;

    -- Handle the action
    IF p_review_action = 'revision_requested' THEN
        UPDATE public.reproduction_requests
        SET status = 'revision_requested'
        WHERE id = p_request_id;

    ELSIF p_review_action = 'accepted' THEN
        -- Find the escrow record
        SELECT * INTO v_escrow
        FROM public.credit_escrow
        WHERE request_id = p_request_id AND status = 'held';

        IF v_escrow IS NULL THEN
            RAISE EXCEPTION 'Escrow record not found or already processed.';
        END IF;

        -- Calculate the split (60% producer, 40% platform)
        v_producer_payout := floor(v_escrow.amount * 0.6);
        v_platform_commission := v_escrow.amount - v_producer_payout;

        -- 1. Update request status to completed
        UPDATE public.reproduction_requests
        SET status = 'completed'
        WHERE id = p_request_id;

        -- 2. Release funds to producer
        UPDATE public.profiles
        SET credits = credits + v_producer_payout
        WHERE id = v_request.producer_id;

        -- 3. Log platform commission
        INSERT INTO public.platform_earnings (source_request_id, amount_credits)
        VALUES (p_request_id, v_platform_commission);

        -- 4. Update escrow record status to released
        UPDATE public.credit_escrow
        SET status = 'released'
        WHERE id = v_escrow.id;

    ELSE
        RAISE EXCEPTION 'Invalid review action. Must be "accepted" or "revision_requested".';
    END IF;
END;
$$;
