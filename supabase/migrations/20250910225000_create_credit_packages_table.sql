-- Create the credit_packages table
CREATE TABLE public.credit_packages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    credits integer NOT NULL,
    price numeric NOT NULL,
    popular boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'active'::text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT credit_packages_pkey PRIMARY KEY (id),
    CONSTRAINT credits_must_be_positive CHECK (credits > 0),
    CONSTRAINT price_must_be_positive CHECK (price > 0)
);

-- Add comments for clarity
COMMENT ON TABLE public.credit_packages IS 'Stores credit packages available for one-time purchase.';
COMMENT ON COLUMN public.credit_packages.name IS 'The display name of the credit package (e.g., "Starter Pack").';
COMMENT ON COLUMN public.credit_packages.description IS 'A brief description of the package, if needed.';
COMMENT ON COLUMN public.credit_packages.credits IS 'The number of credits a user receives upon purchase.';
COMMENT ON COLUMN public.credit_packages.price IS 'The price of the package in USD.';
COMMENT ON COLUMN public.credit_packages.popular IS 'If true, the package will be highlighted on the billing page.';
COMMENT ON COLUMN public.credit_packages.status IS 'The status of the package (e.g., "active", "inactive").';
COMMENT ON COLUMN public.credit_packages.created_at IS 'The timestamp when the package was created.';


-- Enable Row Level Security
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credit_packages

-- This policy allows administrators to perform any action on the credit_packages table.
-- It relies on an `is_admin()` function that should check if the currently authenticated user has an 'admin' or 'super_admin' role.
CREATE POLICY "Allow admins full access"
ON public.credit_packages
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- This policy allows any authenticated user to view credit packages that are marked as 'active'.
-- This is necessary so that users can see the available packages on the billing page.
CREATE POLICY "Allow authenticated users to read active packages"
ON public.credit_packages
FOR SELECT
TO authenticated
USING (status = 'active'::text);
