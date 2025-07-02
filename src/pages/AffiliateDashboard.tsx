
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Copy, Link as LinkIcon } from 'lucide-react';
import ReferralsList from '@/components/affiliate/ReferralsList';
import EarningsInfo from '@/components/affiliate/EarningsInfo';
import PayoutHistory from '@/components/affiliate/PayoutHistory';

// ReferralLinkDisplay component (kept local as it's specific to this dashboard's layout)
const ReferralLinkDisplay: React.FC<{ referralCode: string | null }> = ({ referralCode }) => {
  if (!referralCode) {
    return (
      <Card>
        <CardHeader><CardTitle>Your Referral Link</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Referral code not yet available.</p></CardContent>
      </Card>
    );
  }
  const referralLink = `${window.location.origin}/register?ref=${referralCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink)
      .then(() => toast.success("Referral link copied to clipboard!"))
      .catch(() => toast.error("Failed to copy referral link."));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><LinkIcon className="mr-2 h-5 w-5" /> Your Referral Link</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-grow p-2 border rounded-md bg-muted text-sm"
          />
          <Button variant="outline" size="icon" onClick={copyToClipboard} aria-label="Copy referral link">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Share this link with your friends to earn commissions!</p>
      </CardContent>
    </Card>
  );
};

const AffiliateDashboard: React.FC = () => {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [loadingCode, setLoadingCode] = useState(true);

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
          } else if (data) {
            setReferralCode(data.unique_referral_code);
          } else {
            setReferralCode(null);
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

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Affiliate Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.user_metadata?.full_name || user?.email || 'Affiliate'}!</p>
        </div>
      </div>

      {loadingCode ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="ml-4 text-lg text-muted-foreground">Loading your affiliate details...</p>
        </div>
      ) : user && referralCode ? (
        <div className="space-y-8">
          <ReferralLinkDisplay referralCode={referralCode} />
          <EarningsInfo affiliateId={user.id} />
          <ReferralsList affiliateId={user.id} />
          <PayoutHistory affiliateId={user.id} />
        </div>
      ) : user && !referralCode ? (
         <Card>
          <CardHeader>
            <CardTitle>Become an Affiliate</CardTitle>
            <CardDescription>Join our affiliate program to start earning!</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Your affiliate application might be pending review, or you haven't applied yet.
            </p>
            <Link to="/become-affiliate">
              <Button>Apply to Become an Affiliate</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
            <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
            <CardContent><p>Please log in to view your affiliate dashboard.</p></CardContent>
        </Card>
      )}
    </div>
  );
};

export default AffiliateDashboard;
