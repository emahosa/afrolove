CREATE OR REPLACE FUNCTION cast_vote(entry_id_to_vote_for UUID, voter_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  entry_owner_id UUID;
  contest_id_of_entry UUID;
  has_voted_before BOOLEAN;
  voter_credits INT;
  VOTE_COST INT := 5;
BEGIN
  -- 1. Check if the user is voting for themselves
  SELECT user_id, contest_id INTO entry_owner_id, contest_id_of_entry
  FROM contest_entries
  WHERE id = entry_id_to_vote_for;

  IF entry_owner_id = voter_id THEN
    RETURN 'You cannot vote for your own entry.';
  END IF;

  -- 2. Check if this is the user's first vote in this contest
  SELECT EXISTS (
    SELECT 1
    FROM contest_votes
    WHERE contest_votes.user_id = voter_id AND contest_votes.contest_id = contest_id_of_entry
  ) INTO has_voted_before;

  -- 3. If it's not the first vote, check for credits and deduct them
  IF has_voted_before THEN
    -- Check user's credits
    SELECT credits INTO voter_credits FROM profiles WHERE id = voter_id;
    IF voter_credits < VOTE_COST THEN
      RETURN 'You do not have enough credits to vote again.';
    END IF;

    -- Deduct credits
    UPDATE profiles
    SET credits = credits - VOTE_COST
    WHERE id = voter_id;
  ELSE
    -- It's the first vote, so log it to prevent free votes in the future
    INSERT INTO contest_votes (user_id, contest_id, entry_id)
    VALUES (voter_id, contest_id_of_entry, entry_id_to_vote_for);
  END IF;

  -- 4. Increment the vote count for the entry
  UPDATE contest_entries
  SET vote_count = vote_count + 1
  WHERE id = entry_id_to_vote_for;

  RETURN 'Vote cast successfully.';
END;
$$;
