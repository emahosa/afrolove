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
      // Fetch stats, links, wallet, and earnings in parallel
      const [statsRes, linksRes, walletRes, earningsRes] = await Promise.all([
        supabase.functions.invoke('get-my-affiliate-stats'),
        supabase.functions.invoke('get-affiliate-data', { body: { type: 'links', userId: user.id } }),
        supabase.functions.invoke('get-affiliate-data', { body: { type: 'wallet', userId: user.id } }),
        supabase.functions.invoke('get-affiliate-data', { body: { type: 'earnings', userId: user.id } }),
      ]);

      if (statsRes.error) throw new Error('Failed to fetch affiliate stats.');
      // The stats from get-my-affiliate-stats is the primary source of truth for the top cards
      const fetchedStats = statsRes.data || { totalReferrals: 0, totalEarnings: 0, conversionRate: 0, clicksCount: 0 };
      setStats(fetchedStats);

      if (linksRes.error) throw new Error('Failed to fetch affiliate links.');
      // The link object needs the click count from the stats response
      const fetchedLinks = linksRes.data.links || [];
      if (fetchedLinks.length > 0) {
        fetchedLinks[0].clicks_count = fetchedStats.clicksCount;
      }
      setLinks(fetchedLinks);

      if (walletRes.error) throw new Error('Failed to fetch affiliate wallet.');
      setWallet(walletRes.data.wallet || null);

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
