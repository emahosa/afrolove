-- Drop the old, likely problematic RLS policy for admins on winner_claim_details
DROP POLICY IF EXISTS "Admins can manage all claim details" ON public.winner_claim_details;

-- Create a new, more robust RLS policy for admins that directly checks the user_roles table
CREATE POLICY "Admins can manage all claim details"
ON public.winner_claim_details
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'::user_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'::user_role
  )
);
