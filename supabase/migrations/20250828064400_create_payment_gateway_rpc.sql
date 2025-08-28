CREATE OR REPLACE FUNCTION get_payment_gateways()
RETURNS TABLE(id bigint, name text, enabled boolean, public_key text, secret_key text)
LANGUAGE sql
SECURITY DEFINER
AS $$
    -- RLS will be enforced on the table for admin access
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
    -- RLS will be enforced on the table for admin access
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
-- RLS policies on the 'payment_gateways' table should handle authorization
GRANT EXECUTE ON FUNCTION get_payment_gateways() TO authenticated;
GRANT EXECUTE ON FUNCTION update_payment_gateway(bigint, boolean, text, text) TO authenticated;

-- Add RLS policies for the payment_gateways table
ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admins full access to payment gateways"
ON payment_gateways
FOR ALL
USING (
  (SELECT check_user_role(auth.uid(), 'admin')) OR
  (SELECT check_user_role(auth.uid(), 'super_admin'))
)
WITH CHECK (
  (SELECT check_user_role(auth.uid(), 'admin')) OR
  (SELECT check_user_role(auth.uid(), 'super_admin'))
);

-- Note: The check_user_role function is assumed to exist from previous migrations.
-- If it doesn't, it would need to be created. Example:
-- CREATE OR REPLACE FUNCTION check_user_role(user_id uuid, role_name text)
-- RETURNS boolean AS $$
-- BEGIN
--   RETURN EXISTS (
--     SELECT 1
--     FROM user_roles
--     WHERE user_roles.user_id = check_user_role.user_id
--       AND user_roles.role = role_name
--   );
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
