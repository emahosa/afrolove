CREATE POLICY "Allow public read access to specific settings"
ON public.system_settings
FOR SELECT
TO authenticated, anon
USING (key = 'heroVideoUrl');
