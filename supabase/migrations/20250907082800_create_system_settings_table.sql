CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    description TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to all settings
CREATE POLICY "Allow public read access"
ON public.system_settings
FOR SELECT
USING (true);

-- Policy: Allow admin users to manage all settings
CREATE POLICY "Allow admins full access"
ON public.system_settings
FOR ALL
USING (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
));

-- Add a comment to the table for clarity
COMMENT ON TABLE public.system_settings IS 'Stores system-wide settings, such as API keys, feature flags, and other configuration.';
