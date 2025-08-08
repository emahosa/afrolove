
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

      // Fetch basic referral count from profiles table
      const { count: totalReferrals } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_id', affiliateId);

      // Fetch commission data from affiliate_commissions table
      const { data: commissions } = await supabase
        .from('affiliate_commissions')
        .select('amount, status, commission_type')
        .eq('affiliate_id', affiliateId);

      const totalEarnings = commissions?.reduce((sum, commission) => sum + (commission.amount || 0), 0) || 0;
      const pendingEarnings = commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
      const paidEarnings = commissions?.filter(c => c.status === 'paid').reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
      const subscriptionCommissions = commissions?.filter(c => c.commission_type === 'subscription').reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

      // Calculate conversion rate (assume 100 clicks for now, should be tracked properly)
      const conversionRate = totalReferrals ? (totalReferrals / 100) * 100 : 0;

      setStats({
        totalReferrals: totalReferrals || 0,
        totalEarnings,
        conversionRate,
        clicksCount: 0, // This would need proper tracking
        pendingEarnings,
        paidEarnings,
        activeReferrals: totalReferrals || 0,
        subscriptionCommissions
      });

    } catch (err: any) {
      console.error('Error fetching affiliate stats:', err);
      setError(err.message || 'Failed to fetch affiliate stats');
      
      // Fallback to basic data
      setStats({
        totalReferrals: 0,
        totalEarnings: 0,
        conversionRate: 0,
        clicksCount: 0,
        pendingEarnings: 0,
        paidEarnings: 0,
        activeReferrals: 0,
        subscriptionCommissions: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [affiliateId]);

  return { stats, loading, error, refetch: fetchStats };
};
