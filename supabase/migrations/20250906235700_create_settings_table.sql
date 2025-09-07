-- Create the settings table
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB
);

-- Enable Row Level Security for the settings table
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow public read access
CREATE POLICY "Allow public read access to settings"
ON public.settings FOR SELECT
TO anon, authenticated
USING (true);

-- Create a policy to allow authenticated users to manage settings
-- Create a policy to allow admin users to manage settings
CREATE POLICY "Allow admin users to manage settings"
ON public.settings FOR ALL
TO authenticated
USING ((get_my_claim('user_role'::text) = '"admin"'::jsonb))
WITH CHECK ((get_my_claim('user_role'::text) = '"admin"'::jsonb));
