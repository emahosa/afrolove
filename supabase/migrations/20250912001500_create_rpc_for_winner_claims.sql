-- Create a function to get all winner claim details for a specific user, including the contest name.
CREATE OR REPLACE FUNCTION get_winner_claims_for_user(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  contest_id UUID,
  user_id UUID,
  winner_rank INT,
  full_name TEXT,
  address TEXT,
  phone_number TEXT,
  social_media_link TEXT,
  bank_account_details TEXT,
  status TEXT,
  admin_notes TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  contest_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wcd.id,
    wcd.contest_id,
    wcd.user_id,
    wcd.winner_rank,
    wcd.full_name,
    wcd.address,
    wcd.phone_number,
    wcd.social_media_link,
    wcd.bank_account_details,
    wcd.status,
    wcd.admin_notes,
    wcd.submitted_at,
    wcd.created_at,
    c.name AS contest_name
  FROM
    public.winner_claim_details AS wcd
  LEFT JOIN
    public.contests AS c ON wcd.contest_id = c.id
  WHERE
    wcd.user_id = p_user_id
  ORDER BY
    wcd.submitted_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission to the authenticated role
GRANT EXECUTE ON FUNCTION get_winner_claims_for_user(UUID) TO authenticated;
