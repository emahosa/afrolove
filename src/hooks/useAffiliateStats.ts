
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

      // Use Supabase functions to get affiliate stats
      const { data: statsData, error: statsError } = await supabase.functions.invoke('get-my-affiliate-stats', {
        body: { affiliateId }
      });

      if (statsError) {
        console.error('Error fetching affiliate stats:', statsError);
        throw new Error(statsError.message);
      }

      if (statsData && statsData.success) {
        setStats({
          totalReferrals: statsData.data?.totalReferrals || 0,
          totalEarnings: parseFloat(statsData.data?.totalEarnings || '0'),
          conversionRate: parseFloat(statsData.data?.conversionRate || '0'),
          clicksCount: statsData.data?.clicksCount || 0,
          pendingEarnings: parseFloat(statsData.data?.pendingEarnings || '0'),
          paidEarnings: parseFloat(statsData.data?.paidEarnings || '0'),
          activeReferrals: statsData.data?.activeReferrals || 0,
          subscriptionCommissions: parseFloat(statsData.data?.subscriptionCommissions || '0')
        });
      } else {
        // Fallback: fetch basic data from profiles table
        const { count: totalReferrals } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('referrer_id', affiliateId);

        setStats({
          totalReferrals: totalReferrals || 0,
          totalEarnings: 0,
          conversionRate: 0,
          clicksCount: 0,
          pendingEarnings: 0,
          paidEarnings: 0,
          activeReferrals: 0,
          subscriptionCommissions: 0
        });
      }

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
