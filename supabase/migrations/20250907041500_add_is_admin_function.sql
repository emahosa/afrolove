CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE public.user_roles.user_id = $1
    AND public.user_roles.role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
