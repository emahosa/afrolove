CREATE TABLE payment_gateways (
    id bigserial PRIMARY KEY,
    name text NOT NULL UNIQUE,
    enabled boolean DEFAULT false NOT NULL,
    secret_key text,
    public_key text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on row update
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON payment_gateways
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Insert initial data for Stripe and Paystack
INSERT INTO payment_gateways (name, enabled) VALUES ('stripe', true);
INSERT INTO payment_gateways (name, enabled) VALUES ('paystack', false);

-- Remove old stripe_enabled setting if it exists
DELETE FROM system_settings WHERE key = 'stripe_enabled';
