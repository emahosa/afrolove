-- Add ngn_price column to plans and credit_packages tables

-- Add ngn_price to plans table
ALTER TABLE public.plans
ADD COLUMN ngn_price NUMERIC(10, 2);

-- Add ngn_price to credit_packages table
ALTER TABLE public.credit_packages
ADD COLUMN ngn_price NUMERIC(10, 2);

-- Set a default value for existing rows
UPDATE public.plans
SET ngn_price = price * 1500;

UPDATE public.credit_packages
SET ngn_price = price * 1500;
