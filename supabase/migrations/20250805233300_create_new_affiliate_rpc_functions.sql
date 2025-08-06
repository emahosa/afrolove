CREATE OR REPLACE FUNCTION get_affiliate_referrals_count(user_id_param UUID)
      RETURNS INTEGER
      LANGUAGE SQL
      SECURITY DEFINER
      AS $$
        SELECT COUNT(*)::INTEGER
        FROM profiles
        WHERE referrer_id = user_id_param;
      $$;

      CREATE OR REPLACE FUNCTION get_total_affiliate_earnings(user_id_param UUID)
      RETURNS NUMERIC
      LANGUAGE SQL
      SECURITY DEFINER
      AS $$
        SELECT COALESCE(SUM(amount), 0)
        FROM affiliate_earnings
        WHERE affiliate_user_id = user_id_param;
      $$;

      CREATE OR REPLACE FUNCTION get_affiliate_payout_history(user_id_param UUID)
      RETURNS TABLE (
        id UUID,
        requested_amount NUMERIC,
        status TEXT,
        requested_at TIMESTAMPTZ,
        processed_at TIMESTAMPTZ,
        admin_notes TEXT
      )
      LANGUAGE SQL
      SECURITY DEFINER
      AS $$
        SELECT id, requested_amount, status, requested_at, processed_at, admin_notes
        FROM affiliate_payout_requests
        WHERE affiliate_user_id = user_id_param
        ORDER BY requested_at DESC;
      $$;
