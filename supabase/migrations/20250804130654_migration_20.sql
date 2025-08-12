
-- First, let's drop all the problematic RLS policies on contest_entries that might reference auth.users
DROP POLICY IF EXISTS "Admins can manage all contest entries" ON public.contest_entries;
DROP POLICY IF EXISTS "contest_entries_insert_policy" ON public.contest_entries;
DROP POLICY IF EXISTS "contest_entries_select_policy" ON public.contest_entries;
DROP POLICY IF EXISTS "contest_entries_update_policy" ON public.contest_entries;

-- Create clean, working RLS policies that don't reference auth.users directly
CREATE POLICY "Users can insert their own contest entries"
ON public.contest_entries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view approved contest entries"
ON public.contest_entries
FOR SELECT
USING (approved = true);

CREATE POLICY "Users can view their own contest entries"
ON public.contest_entries
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own contest entries"
ON public.contest_entries
FOR UPDATE
USING (auth.uid() = user_id);

-- Admin policy using the has_role function instead of direct auth.users reference
CREATE POLICY "Admins can manage contest entries"
ON public.contest_entries
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::user_role
  )
);

-- Moderator policy
CREATE POLICY "Moderators can manage contest entries"
ON public.contest_entries
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'moderator'::user_role
  )
);
