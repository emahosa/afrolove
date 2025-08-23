
UPDATE public.profiles
SET username = (
    SELECT email FROM auth.users WHERE id = public.profiles.id
)
WHERE 
    id IN (SELECT id FROM auth.users) 
    AND (username IS NULL OR username = '' OR username = 'No Email Provided');
