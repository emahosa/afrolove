-- Ensure proper role-based permission system for Afroverse

-- First, ensure we have all required roles in the user_role enum
DO $$ 
BEGIN
    -- Check if contest_entrant exists, if not add it
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'contest_entrant' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
        ALTER TYPE user_role ADD VALUE 'contest_entrant';
    END IF;
END $$;

-- Create a function to automatically assign subscriber role when user subscribes
CREATE OR REPLACE FUNCTION assign_subscriber_role()
RETURNS TRIGGER AS $$
BEGIN
    -- When subscription becomes active, assign subscriber role
    IF NEW.subscription_status = 'active' AND (OLD.subscription_status IS NULL OR OLD.subscription_status != 'active') THEN
        -- Remove voter role if exists and add subscriber role
        DELETE FROM user_roles WHERE user_id = NEW.user_id AND role = 'voter';
        
        INSERT INTO user_roles (user_id, role) 
        VALUES (NEW.user_id, 'subscriber')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
    
    -- When subscription becomes inactive, revert to voter
    IF NEW.subscription_status = 'inactive' AND OLD.subscription_status = 'active' THEN
        DELETE FROM user_roles WHERE user_id = NEW.user_id AND role = 'subscriber';
        
        INSERT INTO user_roles (user_id, role) 
        VALUES (NEW.user_id, 'voter')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic role assignment
DROP TRIGGER IF EXISTS on_subscription_change ON user_subscriptions;
CREATE TRIGGER on_subscription_change
    AFTER UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION assign_subscriber_role();

-- Create a function to check if user can apply for affiliate
CREATE OR REPLACE FUNCTION can_apply_for_affiliate(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = user_id_param AND role = 'subscriber'
    ) AND NOT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = user_id_param AND role = 'affiliate'
    ) AND NOT EXISTS (
        SELECT 1 FROM affiliate_applications 
        WHERE user_id = user_id_param AND status IN ('pending', 'approved')
    );
$$;

-- Function to check if user is only a voter (no other roles)
CREATE OR REPLACE FUNCTION is_only_voter(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = user_id_param AND role = 'voter'
    ) AND NOT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = user_id_param AND role IN ('subscriber', 'affiliate', 'admin', 'super_admin')
    );
$$;

-- Update the handle_new_user function to ensure proper default role assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, username, full_name, avatar_url, credits)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    5
  );
  
  -- Always assign voter role as default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'voter');
  
  -- Create default free subscription record
  INSERT INTO public.user_subscriptions (user_id, subscription_type, subscription_status)
  VALUES (NEW.id, 'free', 'inactive');
  
  RETURN NEW;
END;
$$;