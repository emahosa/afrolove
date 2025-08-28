CREATE TABLE payment_gateways (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    api_key TEXT NOT NULL,
    secret_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'inactive',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin to manage all payment gateways"
ON payment_gateways
FOR ALL
TO service_role
USING (true);
