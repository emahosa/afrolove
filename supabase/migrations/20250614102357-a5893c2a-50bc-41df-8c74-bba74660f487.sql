
-- Create a table to store admin permissions for ordinary admins
CREATE TABLE IF NOT EXISTS public.admin_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE(user_id, permission)
);

-- Enable RLS on admin_permissions
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- Create policy for admin_permissions - only super admins can manage permissions
CREATE POLICY "Super admins can manage all permissions" 
  ON public.admin_permissions 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND username = 'ellaadahosa@gmail.com'
    )
  );

-- Create policy for ordinary admins to view their own permissions
CREATE POLICY "Admins can view their own permissions" 
  ON public.admin_permissions 
  FOR SELECT 
  USING (user_id = auth.uid());

-- Create a table to store user subscription status
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_type TEXT NOT NULL DEFAULT 'free',
  subscription_status TEXT NOT NULL DEFAULT 'inactive',
  started_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on user_subscriptions
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for user_subscriptions
CREATE POLICY "Users can view their own subscription" 
  ON public.user_subscriptions 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own subscription" 
  ON public.user_subscriptions 
  FOR UPDATE 
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all subscriptions" 
  ON public.user_subscriptions 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND username = 'ellaadahosa@gmail.com'
    )
  );

-- Create function to check if user has specific admin permission
CREATE OR REPLACE FUNCTION public.has_admin_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- Super admin has all permissions
  SELECT CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = _user_id 
      AND username = 'ellaadahosa@gmail.com'
    ) THEN true
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = _user_id 
      AND role = 'super_admin'
    ) THEN true
    -- Check specific permission for ordinary admins
    ELSE EXISTS (
      SELECT 1 FROM public.admin_permissions 
      WHERE user_id = _user_id 
      AND permission = _permission
    )
  END;
$function$;

-- Create function to check if user is subscriber
CREATE OR REPLACE FUNCTION public.is_subscriber(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = _user_id 
    AND subscription_status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
    AND role = 'subscriber'
  );
$function$;

-- Update the handle_new_user function to set appropriate default roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url, credits)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    5 -- Default starting credits
  );
  
  -- Set default role as voter (non-subscriber)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'voter');
  
  -- Create default subscription record
  INSERT INTO public.user_subscriptions (user_id, subscription_type, subscription_status)
  VALUES (new.id, 'free', 'inactive');
  
  RETURN new;
END;
$function$;
