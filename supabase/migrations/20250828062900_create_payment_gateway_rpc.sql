CREATE OR REPLACE FUNCTION get_payment_gateways()
RETURNS TABLE(id bigint, name text, enabled boolean, public_key text, secret_key text)
LANGUAGE sql
SECURITY DEFINER
AS $$
    -- Only allow admins to get payment gateways
    -- RLS should be in place for the calling user to be an admin
    SELECT id, name, enabled, public_key, secret_key FROM payment_gateways;
$$;

CREATE OR REPLACE FUNCTION update_payment_gateway(
    gateway_id bigint,
    is_enabled boolean,
    new_public_key text,
    new_secret_key text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only allow admins to update payment gateways
    -- RLS should be in place for the calling user to be an admin
    UPDATE payment_gateways
    SET
        enabled = is_enabled,
        public_key = new_public_key,
        secret_key = new_secret_key,
        updated_at = now()
    WHERE id = gateway_id;
END;
$$;

-- Grant execute permission to the authenticated role
-- Assumes RLS on a higher level will prevent non-admins from calling
GRANT EXECUTE ON FUNCTION get_payment_gateways() TO authenticated;
GRANT EXECUTE ON FUNCTION update_payment_gateway(bigint, boolean, text, text) TO authenticated;
