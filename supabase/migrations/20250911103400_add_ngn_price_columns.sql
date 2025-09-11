ALTER TABLE public.credit_packages
ADD COLUMN exchange_rate numeric,
ADD COLUMN price_ngn numeric;

ALTER TABLE public.plans
ADD COLUMN exchange_rate numeric,
ADD COLUMN price_ngn numeric;
