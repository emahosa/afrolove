-- Create the credit_packages table
CREATE TABLE public.credit_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    credits INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    popular BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.credit_packages
    FOR SELECT
    TO authenticated, anon
    USING (active = true);

CREATE POLICY "Allow admin full access" ON public.credit_packages
    FOR ALL
    TO service_role
    USING (true);

-- Add some example credit packages
INSERT INTO public.credit_packages (name, description, price, credits, popular)
VALUES
('Starter Pack', '5 credits for $5', 5.00, 5, false),
('Value Pack', '15 credits for $10', 10.00, 15, false),
('Most Popular', '50 credits for $25', 25.00, 50, true),
('Bulk Pack', '100 credits for $45', 45.00, 100, false);
