
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Users, DollarSign, TrendingUp, ExternalLink } from 'lucide-react';
import AffiliateLinks from '@/components/affiliate/AffiliateLinks';
import AffiliateWallet from '@/components/affiliate/AffiliateWallet';
import EarningsBreakdown from '@/components/affiliate/EarningsBreakdown';
import ReferralsList from '@/components/affiliate/ReferralsList';
import PayoutHistory from '@/components/affiliate/PayoutHistory';
import LockScreen from '@/components/LockScreen';

interface AffiliateStats {
  totalReferrals: number;
  totalEarnings: number;
  conversionRate: number;
  clicksCount: number;
}

const AffiliateDashboard: React.FC = () => {
  const { user, isSubscriber, loading: authLoading } = useAuth();
  const [isApprovedAffiliate, setIsApprovedAffiliate] = useState(false);
  const [affiliateStats, setAffiliateStats] = useState<AffiliateStats>({
    totalReferrals: 0,
    totalEarnings: 0,
    conversionRate: 0,
    clicksCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAffiliateStatus = async () => {
      if (user?.id) {
        setLoading(true);
        try {
          // Check if user has approved affiliate application
          const { data: application, error } = await supabase
            .from('affiliate_applications')
            .select('status, unique_referral_code')
            .eq('user_id', user.id)
            .eq('status', 'approved')
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('Error checking affiliate status:', error);
          }

          setIsApprovedAffiliate(!!application);

          if (application) {
            await fetchAffiliateStats();
          }
        } catch (err: any) {
          console.error('Unexpected error:', err);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    checkAffiliateStatus();
  }, [user]);

  const fetchAffiliateStats = async () => {
    if (!user?.id) return;

    try {
      // Get total referrals
      const { count: referralsCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_id', user.id);

      // Get total earnings
      const { data: earnings } = await supabase
        .from('affiliate_earnings')
        .select('amount')
        .eq('affiliate_user_id', user.id);

      // Get click stats
      const { data: links } = await supabase
        .from('affiliate_links')
        .select('clicks_count')
        .eq('affiliate_user_id', user.id);

      const totalEarnings = earnings?.reduce((sum, earning) => sum + Number(earning.amount), 0) || 0;
      const totalClicks = links?.reduce((sum, link) => sum + link.clicks_count, 0) || 0;
      const conversionRate = totalClicks > 0 ? ((referralsCount || 0) / totalClicks) * 100 : 0;

      setAffiliateStats({
        totalReferrals: referralsCount || 0,
        totalEarnings,
        conversionRate,
        clicksCount: totalClicks
      });
    } catch (error) {
      console.error('Error fetching affiliate stats:', error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-4 text-lg text-muted-foreground">Loading Affiliate Dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
        <CardContent><p>Please log in to view your affiliate dashboard.</p></CardContent>
      </Card>
    );
  }

  if (!isApprovedAffiliate) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Affiliate Access Required</CardTitle>
            <CardDescription>You need to be an approved affiliate to access this dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Apply to become an affiliate to start earning commissions from referrals.
            </p>
            <Link to="/become-affiliate">
              <Button>Apply to Become an Affiliate</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isSubscriber()) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <LockScreen 
          message="Your subscription has lapsed. Please resubscribe to access your Affiliate Dashboard features." 
          buttonText="Renew Subscription"
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Affiliate Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.user_metadata?.full_name || user?.email || 'Affiliate'}!</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{affiliateStats.totalReferrals}</div>
            <p className="text-xs text-muted-foreground">People you've referred</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${affiliateStats.totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total commission earned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{affiliateStats.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Clicks to referrals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{affiliateStats.clicksCount}</div>
            <p className="text-xs text-muted-foreground">Link clicks received</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Components */}
      <div className="space-y-8">
        <AffiliateWallet affiliateId={user.id} />
        <AffiliateLinks affiliateId={user.id} />
        <EarningsBreakdown affiliateId={user.id} />
        <ReferralsList affiliateId={user.id} />
        <PayoutHistory affiliateId={user.id} />
      </div>
    </div>
  );
};

export default AffiliateDashboard;
