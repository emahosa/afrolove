import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AffiliateLink, AffiliateWallet, AffiliateEarning } from '@/types/affiliate';
import { toast } from 'sonner';

interface AffiliateStats {
  totalReferrals: number;
  totalEarnings: number;
  conversionRate: number;
  clicksCount: number;
}

export const useAffiliateData = () => {
  const { user } = useAuth();
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [wallet, setWallet] = useState<AffiliateWallet | null>(null);
  const [earnings, setEarnings] = useState<AffiliateEarning[]>([]);
  const [stats, setStats] = useState<AffiliateStats>({
    totalReferrals: 0,
    totalEarnings: 0,
    conversionRate: 0,
    clicksCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAffiliateData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch links, wallet, and earnings in parallel
      const [linksRes, walletRes, earningsRes, statsRes] = await Promise.all([
        supabase.functions.invoke('get-affiliate-data', { body: { type: 'links', userId: user.id } }),
        supabase.functions.invoke('get-affiliate-data', { body: { type: 'wallet', userId: user.id } }),
        supabase.functions.invoke('get-affiliate-data', { body: { type: 'earnings', userId: user.id } }),
        supabase.functions.invoke('get-my-affiliate-stats')
      ]);

      if (linksRes.error) throw new Error('Failed to fetch affiliate links.');
      setLinks(linksRes.data.links || []);

      if (walletRes.error) throw new Error('Failed to fetch affiliate wallet.');
      setWallet(walletRes.data.wallet || null);

      if (earningsRes.error) throw new Error('Failed to fetch affiliate earnings.');
      setEarnings(earningsRes.data.earnings || []);

      if (statsRes.error) throw new Error('Failed to fetch affiliate stats.');
      setStats(statsRes.data || { totalReferrals: 0, totalEarnings: 0, conversionRate: 0, clicksCount: 0 });

    } catch (err: any) {
      const errorMessage = err.message || 'An unknown error occurred.';
      console.error('Error fetching affiliate data:', err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAffiliateData();
  }, [fetchAffiliateData]);

  return {
    links,
    wallet,
    earnings,
    stats,
    loading,
    error,
    refresh: fetchAffiliateData,
  };
};
