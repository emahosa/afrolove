-- This migration corrects the data types and values within the JSONB
-- value of the 'payment_gateway_settings' row. It ensures that
-- 'enabled' is a boolean, 'activeGateway' is 'paystack', and that
-- test keys are present, to fix a bug where payments appeared disabled.

UPDATE system_settings
SET
  value = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            value,
            '{enabled}',
            'true'::jsonb,
            false
          ),
          '{activeGateway}',
          '"paystack"'::jsonb,
          false
        ),
        '{mode}',
        '"test"'::jsonb,
        false
      ),
      '{paystack,test,publicKey}',
      '"pk_test_7e51eb9c6bdfcbc7fb9fe166978fe29f9e0cfed9"'::jsonb,
      false
    ),
    '{paystack,test,secretKey}',
    '"sk_test_03ceac5bf5a0f2e1230caad16af27852396555be"'::jsonb,
    false
  ),
  updated_at = now()
WHERE
  key = 'payment_gateway_settings';
