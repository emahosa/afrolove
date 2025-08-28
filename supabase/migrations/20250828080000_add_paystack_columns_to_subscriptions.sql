ALTER TABLE public.user_subscriptions
ADD COLUMN paystack_subscription_code TEXT,
ADD COLUMN paystack_customer_code TEXT;
