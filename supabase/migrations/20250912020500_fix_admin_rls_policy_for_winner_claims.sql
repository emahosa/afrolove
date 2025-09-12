-- Drop the old policy
DROP POLICY "Admins can manage all claim details" ON public.winner_claim_details;

-- Create the new policy with WITH CHECK
CREATE POLICY "Admins can manage all claim details"
ON public.winner_claim_details
FOR ALL
USING (has_role('admin'::user_role))
WITH CHECK (has_role('admin'::user_role));
