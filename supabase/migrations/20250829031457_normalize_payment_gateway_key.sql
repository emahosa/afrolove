-- 🔹 1. Remove duplicates and enforce lowercase key naming

-- If there’s an old row with 'Payment_Gateway_Settings', merge it into the correct key.
DO $$
DECLARE
    old_settings jsonb;
    new_settings jsonb;
BEGIN
    SELECT value INTO old_settings
    FROM system_settings
    WHERE key = 'Payment_Gateway_Settings';

    SELECT value INTO new_settings
    FROM system_settings
    WHERE key = 'payment_gateway_settings';

    -- If old exists but new doesn't, copy it over
    IF old_settings IS NOT NULL AND new_settings IS NULL THEN
        INSERT INTO system_settings (key, value)
        VALUES ('payment_gateway_settings', old_settings);
    END IF;

    -- If both exist, keep the most recent
    IF old_settings IS NOT NULL AND new_settings IS NOT NULL THEN
        UPDATE system_settings
        SET value = COALESCE(new_settings, old_settings)
        WHERE key = 'payment_gateway_settings';
    END IF;

    -- Delete the legacy uppercase key
    DELETE FROM system_settings WHERE key = 'Payment_Gateway_Settings';
END $$;

-- 🔹 2. Enforce lowercase-only keys going forward
ALTER TABLE system_settings
ADD CONSTRAINT system_settings_key_lowercase CHECK (key = lower(key));

-- 🔹 3. Add a unique index so you never get duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_settings_key
ON system_settings (key);
