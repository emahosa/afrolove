CREATE OR REPLACE FUNCTION cast_vote(
    entry_id UUID,
    p_contest_id UUID,
    p_num_votes INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID := auth.uid();
    entry_owner_id UUID;
    has_free_vote BOOLEAN;
    credits_to_deduct INTEGER := 0;
    actual_votes_to_pay INTEGER;
    user_credits INTEGER;
    vote_cost INTEGER := 5;
BEGIN
    -- 1. Check if the user is voting on their own entry
    SELECT user_id INTO entry_owner_id FROM public.contest_entries WHERE id = entry_id;
    IF entry_owner_id = current_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'You cannot vote on your own entry.');
    END IF;

    -- 2. Check if the user has already cast a free vote for this contest
    SELECT EXISTS (
        SELECT 1 FROM public.contest_votes
        WHERE user_id = current_user_id AND contest_id = p_contest_id AND credits_spent = 0
    ) INTO has_free_vote;

    -- 3. Calculate the cost
    IF has_free_vote THEN
        actual_votes_to_pay := p_num_votes;
    ELSE
        actual_votes_to_pay := GREATEST(0, p_num_votes - 1);
    END IF;
    credits_to_deduct := actual_votes_to_pay * vote_cost;

    -- 4. Check if the user has enough credits from the 'profiles' table
    SELECT credits INTO user_credits FROM public.profiles WHERE id = current_user_id;
    IF user_credits < credits_to_deduct THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient credits.');
    END IF;

    -- 5. Deduct credits from the 'profiles' table
    IF credits_to_deduct > 0 THEN
        UPDATE public.profiles SET credits = credits - credits_to_deduct WHERE id = current_user_id;
    END IF;

    -- 6. Record the vote
    INSERT INTO public.contest_votes (user_id, contest_id, contest_entry_id, num_votes, credits_spent)
    VALUES (current_user_id, p_contest_id, entry_id, p_num_votes, credits_to_deduct);

    -- 7. Update the total vote count on the entry
    UPDATE public.contest_entries
    SET
        vote_count = vote_count + p_num_votes,
        last_voted_at = NOW()
    WHERE id = entry_id;

    RETURN jsonb_build_object('success', true, 'message', 'Vote cast successfully.');
END;
$$;
