
-- Create a table to store system settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(category, key)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to manage settings
CREATE POLICY "Admins can manage system settings"
ON public.system_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'ellaadahosa@gmail.com'
  )
);

-- Insert default settings
INSERT INTO public.system_settings (category, key, value, description) VALUES
('general', 'site_name', '"Afroverse"', 'Name of the site'),
('general', 'support_email', '"support@afroverse.com"', 'Support email address'),
('general', 'maximum_file_size', '50', 'Maximum file size in MB'),
('general', 'auto_delete_days', '30', 'Days before auto-deletion of temporary files'),
('api', 'rate_limit', '100', 'API rate limit per minute'),
('api', 'cache_duration', '15', 'Cache duration in minutes'),
('api', 'enable_throttling', 'true', 'Enable API throttling'),
('api', 'log_api_calls', 'true', 'Log all API calls'),
('security', 'password_min_length', '8', 'Minimum password length'),
('security', 'password_requires_symbol', 'true', 'Require symbol in password'),
('security', 'session_timeout', '60', 'Session timeout in minutes'),
('security', 'two_factor_enabled', 'false', 'Enable two-factor authentication'),
('notifications', 'email_notifications', 'true', 'Enable email notifications'),
('notifications', 'song_completion_notices', 'true', 'Enable song completion notices'),
('notifications', 'system_announcements', 'true', 'Enable system announcements'),
('notifications', 'marketing_emails', 'false', 'Enable marketing emails')
ON CONFLICT (category, key) DO NOTHING;

-- Create trigger to update updated_at
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
