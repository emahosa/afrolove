-- ENUM for reproduction request status
CREATE TYPE public.reproduction_request_status AS ENUM (
    'pending_producer_acceptance',
    'in_progress',
    'pending_user_review',
    'completed',
    'revision_requested',
    'rejected_by_producer',
    'rejected_by_user',
    'cancelled_by_user'
);

-- Main table for reproduction requests
CREATE TABLE public.reproduction_requests (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id),
    producer_id uuid NOT NULL REFERENCES auth.users(id),
    original_track_url text NOT NULL,
    user_vocal_recording_url text NOT NULL,
    final_track_url text, -- Added by producer upon completion
    status public.reproduction_request_status NOT NULL DEFAULT 'pending_producer_acceptance',
    price_in_credits integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT reproduction_requests_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.reproduction_requests IS 'Stores user requests for humanizing AI tracks.';

-- Apply the updated_at trigger
CREATE TRIGGER on_reproduction_requests_updated
BEFORE UPDATE ON public.reproduction_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- ENUM for escrow status
CREATE TYPE public.credit_escrow_status AS ENUM ('held', 'released', 'refunded');

-- Table for credit escrow
CREATE TABLE public.credit_escrow (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    request_id uuid NOT NULL REFERENCES public.reproduction_requests(id),
    user_id uuid NOT NULL REFERENCES auth.users(id),
    producer_id uuid NOT NULL REFERENCES auth.users(id),
    amount integer NOT NULL,
    status public.credit_escrow_status NOT NULL DEFAULT 'held',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT credit_escrow_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.credit_escrow IS 'Manages credits held in escrow for track reproduction jobs.';

-- Apply the updated_at trigger
CREATE TRIGGER on_credit_escrow_updated
BEFORE UPDATE ON public.credit_escrow
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- RLS Policies
ALTER TABLE public.reproduction_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_escrow ENABLE ROW LEVEL SECURITY;

-- Policies for reproduction_requests
CREATE POLICY "Users can view their own requests"
ON public.reproduction_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own requests"
ON public.reproduction_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cancellable requests"
ON public.reproduction_requests FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending_producer_acceptance');

CREATE POLICY "Producers can view assigned requests"
ON public.reproduction_requests FOR SELECT
USING (auth.uid() = producer_id);

CREATE POLICY "Producers can update requests they are working on"
ON public.reproduction_requests FOR UPDATE
USING (auth.uid() = producer_id AND status IN ('pending_producer_acceptance', 'in_progress', 'revision_requested'));

CREATE POLICY "Admins can manage all requests"
ON public.reproduction_requests FOR ALL
USING (public.is_admin(auth.uid()));

-- Policies for credit_escrow
CREATE POLICY "Users and Producers can view their own escrow records"
ON public.credit_escrow FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = producer_id);

CREATE POLICY "Admins can manage all escrow records"
ON public.credit_escrow FOR ALL
USING (public.is_admin(auth.uid()));
