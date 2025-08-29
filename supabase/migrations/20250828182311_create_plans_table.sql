-- Create the plans table
CREATE TABLE public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    "interval" TEXT NOT NULL,
    features TEXT[],
    credits_per_month INTEGER NOT NULL,
    rank INTEGER NOT NULL DEFAULT 0,
    stripe_price_id TEXT,
    paystack_plan_code TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add some example plans (you can customize these)
INSERT INTO public.plans (name, description, price, "interval", features, credits_per_month, rank, stripe_price_id, paystack_plan_code)
VALUES
('Basic', '$9.99/month', 9.99, 'month', ARRAY['20 credits monthly', 'Access to all basic AI models'], 20, 1, 'price_your_stripe_id_1', 'PLN_your_paystack_code_1'),
('Premium', '$19.99/month', 19.99, 'month', ARRAY['75 credits monthly', 'Access to premium models', 'High quality exports'], 75, 2, 'price_your_stripe_id_2', 'PLN_your_paystack_code_2'),
('Professional', '$39.99/month', 39.99, 'month', ARRAY['200 credits monthly', 'Commercial usage rights', 'Priority support'], 200, 3, 'price_your_stripe_id_3', 'PLN_your_paystack_code_3');
