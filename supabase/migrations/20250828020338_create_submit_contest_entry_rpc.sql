CREATE OR REPLACE FUNCTION submit_contest_entry(
    p_contest_id UUID,
    p_song_id UUID,
    p_description TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID := auth.uid();
    contest_record RECORD;
    is_unlocked BOOLEAN;
BEGIN
    -- 1. Check if the contest exists and is active
    SELECT * INTO contest_record FROM public.contests WHERE id = p_contest_id;

    IF contest_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Contest not found.');
    END IF;

    IF contest_record.end_date < NOW() OR contest_record.status = 'completed' THEN
        RETURN jsonb_build_object('success', false, 'message', 'This contest has ended.');
    END IF;

    -- 2. Check if the user has unlocked the contest if there is an entry fee
    IF contest_record.entry_fee > 0 THEN
        SELECT EXISTS (
            SELECT 1 FROM public.unlocked_contests
            WHERE user_id = current_user_id AND contest_id = p_contest_id
        ) INTO is_unlocked;

        IF NOT is_unlocked THEN
            RETURN jsonb_build_object('success', false, 'message', 'You must unlock this contest to submit an entry.');
        END IF;
    END IF;

    -- 3. Insert the new entry
    INSERT INTO public.contest_entries (contest_id, user_id, song_id, description, media_type, approved)
    VALUES (p_contest_id, current_user_id, p_song_id, p_description, 'audio', false);

    RETURN jsonb_build_object('success', true, 'message', 'Entry submitted successfully.');
END;
$$;
