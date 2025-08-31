CREATE OR REPLACE FUNCTION update_contest_statuses()
RETURNS void AS $$
BEGIN
    -- Update contests that should be active
    UPDATE contests
    SET status = 'active'
    WHERE start_date <= NOW() AND end_date > NOW() AND status != 'active';

    -- Update contests that have ended
    UPDATE contests
    SET status = 'closed'
    WHERE end_date <= NOW() AND status != 'closed';

    -- Update contests that are upcoming
    UPDATE contests
    SET status = 'upcoming'
    WHERE start_date > NOW() AND status != 'upcoming';
END;
$$ LANGUAGE plpgsql;
