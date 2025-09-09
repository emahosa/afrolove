CREATE OR REPLACE FUNCTION get_past_contest_winners()
RETURNS TABLE(username TEXT, prize TEXT) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_entries AS (
    SELECT
      ce.contest_id,
      ce.user_id,
      c.prize,
      ROW_NUMBER() OVER(PARTITION BY ce.contest_id ORDER BY ce.vote_count DESC, ce.created_at ASC) as rn
    FROM
      contest_entries ce
    JOIN
      contests c ON ce.contest_id = c.id
    WHERE
      c.end_date < NOW()
  )
  SELECT
    p.username,
    re.prize
  FROM
    ranked_entries re
  JOIN
    profiles p ON re.user_id = p.id
  WHERE
    re.rn = 1;
END;
$$ LANGUAGE plpgsql;
