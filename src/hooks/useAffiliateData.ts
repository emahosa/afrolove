import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AffiliateLink, AffiliateWallet, AffiliateEarning, AffiliateStats } from '@/types/affiliate';
import { toast } from 'sonner';

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
      console.log('Fetching affiliate stats...');
      const statsRes = await supabase.functions.invoke('get-my-affiliate-stats');
      console.log('Affiliate Stats Response:', statsRes);
      if (statsRes.error) throw new Error('Failed to fetch affiliate stats.');
      const fetchedStats = statsRes.data || { totalReferrals: 0, totalEarnings: 0, conversionRate: 0, clicksCount: 0 };
      setStats(fetchedStats);

      console.log('Fetching affiliate links...');
      const linksRes = await supabase.functions.invoke('get-affiliate-data', { body: { type: 'links', userId: user.id, origin: window.location.origin } });
      console.log('Affiliate Links Response:', linksRes);
      if (linksRes.error) throw new Error('Failed to fetch affiliate links.');
      const fetchedLinks = linksRes.data.links || [];
      if (fetchedLinks.length > 0) {
        fetchedLinks[0].clicks_count = fetchedStats.clicksCount;
      }
      setLinks(fetchedLinks);

      console.log('Fetching affiliate wallet...');
      const walletRes = await supabase.functions.invoke('get-affiliate-data', { body: { type: 'wallet', userId: user.id } });
      console.log('Affiliate Wallet Response:', walletRes);
      if (walletRes.error) throw new Error('Failed to fetch affiliate wallet.');
      setWallet(walletRes.data.wallet || null);

      console.log('Fetching affiliate earnings...');
      const earningsRes = await supabase.functions.invoke('get-affiliate-data', { body: { type: 'earnings', userId: user.id } });
      console.log('Affiliate Earnings Response:', earningsRes);
      if (earningsRes.error) throw new Error('Failed to fetch affiliate earnings.');
      setEarnings(earningsRes.data.earnings || []);

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
    if (user?.id) {
      fetchAffiliateData();
    }
  }, [user, fetchAffiliateData]);

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
