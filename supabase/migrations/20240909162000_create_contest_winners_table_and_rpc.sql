CREATE TABLE contest_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID REFERENCES contests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contest_id, rank)
);

CREATE OR REPLACE FUNCTION select_contest_winner(
  p_contest_id UUID,
  p_user_id UUID,
  p_rank INTEGER
)
RETURNS void AS $$
BEGIN
  INSERT INTO contest_winners (contest_id, user_id, rank)
  VALUES (p_contest_id, p_user_id, p_rank)
  ON CONFLICT (contest_id, rank) DO UPDATE
  SET user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
