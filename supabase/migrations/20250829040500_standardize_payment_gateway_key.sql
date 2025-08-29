-- First, attempt to delete the old, incorrectly cased setting.
-- This ensures that any existing bad data is removed.
DELETE FROM system_settings
WHERE key = 'Payment_Gateway_Settings';

-- Second, add a CHECK constraint to the table.
-- This enforces that all keys must be lowercase from now on,
-- preventing this type of issue from reoccurring.
-- The "if not exists" clause prevents errors if the constraint
-- was already added manually or in a previous migration attempt.
ALTER TABLE system_settings
ADD CONSTRAINT system_settings_key_is_lowercase CHECK (key = lower(key));
