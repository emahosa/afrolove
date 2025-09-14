INSERT INTO public.system_settings (key, value, description, category)
VALUES (
    'terms_and_conditions',
    '# Terms and Conditions\n\nPlease read these terms and conditions carefully before using Our Service.\n\nThis is a placeholder for the terms and conditions. Please edit this from the admin panel.',
    'The terms and conditions for using the service.',
    'content'
)
ON CONFLICT (key) DO NOTHING;
