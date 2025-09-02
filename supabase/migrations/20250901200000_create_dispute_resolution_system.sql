-- Create the disputes table
CREATE TABLE public.disputes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    request_id uuid NOT NULL REFERENCES public.reproduction_requests(id),
    rejection_reason text,
    status text NOT NULL DEFAULT 'open', -- 'open', 'resolved_refund', 'resolved_payout'
    resolved_by uuid REFERENCES auth.users(id), -- Admin who resolved it
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT disputes_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.disputes IS 'Stores records of rejected requests that require admin intervention.';

-- RLS for disputes
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage disputes" ON public.disputes FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users and producers can view their own disputes" ON public.disputes FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.reproduction_requests
    WHERE id = request_id AND (user_id = auth.uid() OR producer_id = auth.uid())
));


-- Modify the review_final_track RPC to handle rejection
CREATE OR REPLACE FUNCTION public.review_final_track(
    p_request_id uuid,
    p_review_action text, -- 'accepted', 'revision_requested', 'rejected'
    p_rejection_reason text DEFAULT NULL
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

    ELSIF p_review_action = 'rejected' THEN
        -- 1. Update request status
        UPDATE public.reproduction_requests
        SET status = 'rejected_by_user'
        WHERE id = p_request_id;
        -- 2. Create a dispute record
        INSERT INTO public.disputes (request_id, rejection_reason)
        VALUES (p_request_id, p_rejection_reason);
        -- NOTE: Escrow remains 'held'

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

        UPDATE public.reproduction_requests SET status = 'completed' WHERE id = p_request_id;
        UPDATE public.profiles SET credits = credits + v_producer_payout WHERE id = v_request.producer_id;
        INSERT INTO public.platform_earnings (source_request_id, amount_credits) VALUES (p_request_id, v_platform_commission);
        UPDATE public.credit_escrow SET status = 'released' WHERE id = v_escrow.id;

    ELSE
        RAISE EXCEPTION 'Invalid review action.';
    END IF;
END;
$$;


-- RPC for an admin to resolve a dispute
CREATE OR REPLACE FUNCTION public.resolve_dispute(
    p_dispute_id uuid,
    p_resolution text -- 'refund_user' or 'payout_producer'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_id uuid := auth.uid();
    v_dispute public.disputes;
    v_request public.reproduction_requests;
    v_escrow public.credit_escrow;
    v_producer_payout integer;
    v_platform_commission integer;
BEGIN
    -- 1. Validate admin
    IF NOT public.is_admin(v_admin_id) THEN
        RAISE EXCEPTION 'Only admins can resolve disputes.';
    END IF;

    -- 2. Get dispute and escrow details
    SELECT * INTO v_dispute FROM public.disputes WHERE id = p_dispute_id AND status = 'open';
    IF v_dispute IS NULL THEN RAISE EXCEPTION 'Dispute not found or already resolved.'; END IF;

    SELECT * INTO v_escrow FROM public.credit_escrow WHERE request_id = v_dispute.request_id AND status = 'held';
    IF v_escrow IS NULL THEN RAISE EXCEPTION 'Escrow record not found or already processed.'; END IF;

    SELECT * INTO v_request FROM public.reproduction_requests WHERE id = v_dispute.request_id;

    -- 3. Handle resolution
    IF p_resolution = 'refund_user' THEN
        -- Refund credits to the user
        UPDATE public.profiles SET credits = credits + v_escrow.amount WHERE id = v_escrow.user_id;
        -- Update escrow status
        UPDATE public.credit_escrow SET status = 'refunded' WHERE id = v_escrow.id;
        -- Update dispute status
        UPDATE public.disputes SET status = 'resolved_refund', resolved_by = v_admin_id WHERE id = p_dispute_id;

    ELSIF p_resolution = 'payout_producer' THEN
        -- Same logic as 'accepted' case
        v_producer_payout := floor(v_escrow.amount * 0.6);
        v_platform_commission := v_escrow.amount - v_producer_payout;

        UPDATE public.profiles SET credits = credits + v_producer_payout WHERE id = v_request.producer_id;
        INSERT INTO public.platform_earnings (source_request_id, amount_credits) VALUES (v_request.id, v_platform_commission);
        UPDATE public.credit_escrow SET status = 'released' WHERE id = v_escrow.id;
        UPDATE public.disputes SET status = 'resolved_payout', resolved_by = v_admin_id WHERE id = p_dispute_id;
    ELSE
        RAISE EXCEPTION 'Invalid resolution action.';
    END IF;
END;
$$;
