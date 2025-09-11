-- Create the credit_packages table
CREATE TABLE public.credit_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    credits INTEGER NOT NULL,
    active BOOLEAN DEFAULT true,
    popular BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access
CREATE POLICY "Allow public read access for credit packages"
ON public.credit_packages
FOR SELECT
USING (true);

-- Policy: Allow admin users to manage all packages
CREATE POLICY "Allow admins full access for credit packages"
ON public.credit_packages
FOR ALL
USING (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
));

-- Add initial credit packages
INSERT INTO public.credit_packages (name, description, price, credits, popular)
VALUES
('Starter Pack', '5 credits to get you started', 5.00, 5, false),
('Value Pack', '15 credits for the regular creator', 10.00, 15, false),
('Popular Pack', '50 credits, our most popular option', 25.00, 50, true),
('Creator Pack', '100 credits for the serious creator', 45.00, 100, false);

-- Add the USD to credit conversion rate to system_settings
INSERT INTO public.system_settings (key, value, description, category)
VALUES
('usd_to_credit_rate', '50', 'The number of credits a user gets for 1 USD.', 'Billing')
ON CONFLICT (key) DO NOTHING;
