
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import AffiliateLinks from '@/components/affiliate/AffiliateLinks';
import AffiliateWallet from '@/components/affiliate/AffiliateWallet';
import EarningsBreakdown from '@/components/affiliate/EarningsBreakdown';
import ReferralsList from '@/components/affiliate/ReferralsList';
import PayoutHistory from '@/components/affiliate/PayoutHistory';
import LockScreen from '@/components/LockScreen';

const AffiliateDashboard: React.FC = () => {
  const { user, isSubscriber, isAffiliate, loading: authLoading } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [loadingCode, setLoadingCode] = useState(true);
  const [affiliateDataExists, setAffiliateDataExists] = useState(false);

  useEffect(() => {
    const fetchAffiliateData = async () => {
      if (user?.id) {
        setLoadingCode(true);
        try {
          const { data, error } = await supabase
            .from('affiliate_applications')
            .select('unique_referral_code')
            .eq('user_id', user.id)
            .eq('status', 'approved')
            .single();

          if (error) {
            console.warn('Error fetching affiliate data or not an approved affiliate:', error.message);
            setReferralCode(null);
            setAffiliateDataExists(false);
          } else if (data) {
            setReferralCode(data.unique_referral_code);
            setAffiliateDataExists(true);
          } else {
            setReferralCode(null);
            setAffiliateDataExists(false);
          }
        } catch (err: any) {
          console.error('Unexpected error fetching affiliate data:', err);
          toast.error("Could not load your affiliate details.");
        } finally {
          setLoadingCode(false);
        }
      } else {
        setLoadingCode(false);
      }
    };

    fetchAffiliateData();
  }, [user]);

  if (authLoading || loadingCode) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-4 text-lg text-muted-foreground">Loading Affiliate Dashboard...</p>
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

      {!user ? (
        <Card>
          <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
          <CardContent><p>Please log in to view your affiliate dashboard.</p></CardContent>
        </Card>
      ) : !isAffiliate() || !affiliateDataExists ? (
        <Card>
          <CardHeader>
            <CardTitle>Affiliate Access Not Found</CardTitle>
            <CardDescription>Your affiliate status could not be confirmed.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Anyone can apply to become an affiliate. If you have applied, your application might be pending review.
            </p>
            <Link to="/become-affiliate">
              <Button>Apply to Become an Affiliate</Button>
            </Link>
          </CardContent>
        </Card>
      ) : !isSubscriber() && isAffiliate() ? (
        <LockScreen message="Your subscription has lapsed. Please resubscribe to access your Affiliate Dashboard features." buttonText="Renew Subscription"/>
      ) : (
        <div className="space-y-8">
          <AffiliateWallet affiliateId={user.id} />
          <AffiliateLinks affiliateId={user.id} />
          <EarningsBreakdown affiliateId={user.id} />
          <ReferralsList affiliateId={user.id} />
          <PayoutHistory affiliateId={user.id} />
        </div>
      )}
    </div>
  );
};

export default AffiliateDashboard;
