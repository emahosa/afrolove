-- Add the updated_by column to the system_settings table
ALTER TABLE public.system_settings
ADD COLUMN updated_by UUID REFERENCES auth.users(id);

-- Change the value column from TEXT to JSONB
-- The USING clause is necessary to cast the existing text data to the new jsonb type
ALTER TABLE public.system_settings
ALTER COLUMN value TYPE JSONB USING value::jsonb;

-- Add a comment to the new column for clarity
COMMENT ON COLUMN public.system_settings.updated_by IS 'The user ID of the admin who last updated the setting.';
