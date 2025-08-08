
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AffiliateStats {
  totalReferrals: number;
  totalEarnings: number;
  conversionRate: number;
  clicksCount: number;
  pendingEarnings: number;
  paidEarnings: number;
  activeReferrals: number;
  subscriptionCommissions: number;
}

export const useAffiliateStats = (affiliateId: string | null) => {
  const [stats, setStats] = useState<AffiliateStats>({
    totalReferrals: 0,
    totalEarnings: 0,
    conversionRate: 0,
    clicksCount: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
    activeReferrals: 0,
    subscriptionCommissions: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!affiliateId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch affiliate links and clicks
      const { data: links, error: linksError } = await supabase
        .from('affiliate_links')
        .select('clicks_count')
        .eq('affiliate_user_id', affiliateId);

      if (linksError) throw linksError;

      const totalClicks = links?.reduce((sum, link) => sum + link.clicks_count, 0) || 0;

      // Fetch total referrals (users with this affiliate as referrer)
      const { count: totalReferrals, error: referralsError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_id', affiliateId);

      if (referralsError) throw referralsError;

      // Fetch earnings data
      const { data: earnings, error: earningsError } = await supabase
        .from('affiliate_earnings')
        .select('amount, status, earning_type')
        .eq('affiliate_user_id', affiliateId);

      if (earningsError) throw earningsError;

      const totalEarnings = earnings?.reduce((sum, earning) => sum + Number(earning.amount), 0) || 0;
      const pendingEarnings = earnings?.filter(e => e.status === 'pending').reduce((sum, earning) => sum + Number(earning.amount), 0) || 0;
      const paidEarnings = earnings?.filter(e => e.status === 'paid').reduce((sum, earning) => sum + Number(earning.amount), 0) || 0;
      const subscriptionCommissions = earnings?.filter(e => e.earning_type === 'subscription_commission').reduce((sum, earning) => sum + Number(earning.amount), 0) || 0;

      // Fetch active referrals (users who have visited subscription page)
      const { data: activities, error: activitiesError } = await supabase
        .from('user_activities')
        .select('user_id')
        .eq('referrer_affiliate_id', affiliateId)
        .eq('activity_type', 'subscription_page_visit');

      if (activitiesError) throw activitiesError;

      const activeReferrals = new Set(activities?.map(a => a.user_id)).size || 0;

      const conversionRate = totalClicks > 0 ? ((totalReferrals || 0) / totalClicks) * 100 : 0;

      setStats({
        totalReferrals: totalReferrals || 0,
        totalEarnings,
        conversionRate,
        clicksCount: totalClicks,
        pendingEarnings,
        paidEarnings,
        activeReferrals,
        subscriptionCommissions
      });

    } catch (err: any) {
      console.error('Error fetching affiliate stats:', err);
      setError(err.message || 'Failed to fetch affiliate stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [affiliateId]);

  return { stats, loading, error, refetch: fetchStats };
};
