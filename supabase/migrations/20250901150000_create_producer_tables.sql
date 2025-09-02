-- Create a new ENUM type for producer application status
CREATE TYPE public.producer_application_status AS ENUM ('pending', 'approved', 'rejected');

-- Create the producer_applications table
CREATE TABLE public.producer_applications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    status public.producer_application_status NOT NULL DEFAULT 'pending',
    social_media_links jsonb,
    id_document_url text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT producer_applications_pkey PRIMARY KEY (id),
    CONSTRAINT producer_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add comments to the table and columns
COMMENT ON TABLE public.producer_applications IS 'Stores applications from users wanting to become producers.';
COMMENT ON COLUMN public.producer_applications.user_id IS 'Foreign key to the user who applied.';
COMMENT ON COLUMN public.producer_applications.status IS 'The current status of the application (pending, approved, rejected).';
COMMENT ON COLUMN public.producer_applications.social_media_links IS 'JSON object containing links to social media profiles.';
COMMENT ON COLUMN public.producer_applications.id_document_url IS 'Secure URL to the uploaded identification document.';

-- Create a trigger function to update the updated_at timestamp
-- This function might already exist, so we use CREATE OR REPLACE
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to the producer_applications table
CREATE TRIGGER on_producer_applications_updated
BEFORE UPDATE ON public.producer_applications
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create the producer_settings table
CREATE TABLE public.producer_settings (
    user_id uuid NOT NULL,
    price_per_track_credits integer NOT NULL DEFAULT 500,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT producer_settings_pkey PRIMARY KEY (user_id),
    CONSTRAINT producer_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT price_check CHECK (price_per_track_credits >= 500 AND price_per_track_credits <= 5000)
);

-- Add comments to the producer_settings table
COMMENT ON TABLE public.producer_settings IS 'Stores settings specific to producers, like their pricing.';
COMMENT ON COLUMN public.producer_settings.price_per_track_credits IS 'The price a producer charges per track, in credits.';

-- Apply the updated_at trigger to the producer_settings table
CREATE TRIGGER on_producer_settings_updated
BEFORE UPDATE ON public.producer_settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Function to check if the current user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(p_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid() AND role = p_role
  );
END;
$$;

-- Function to check if a user is an admin or super_admin
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = p_user_id AND (role = 'admin' OR role = 'super_admin')
  );
END;
$$;


-- Enable Row-Level Security for the new tables
ALTER TABLE public.producer_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producer_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for producer_applications
CREATE POLICY "Users can view their own applications"
ON public.producer_applications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own applications"
ON public.producer_applications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all applications"
ON public.producer_applications FOR ALL
USING (public.is_admin(auth.uid()));

-- RLS policies for producer_settings
CREATE POLICY "Public can read producer settings"
ON public.producer_settings FOR SELECT
USING (true);

CREATE POLICY "Producers can manage their own settings"
ON public.producer_settings FOR ALL
USING (auth.uid() = user_id AND public.has_role('producer'));
