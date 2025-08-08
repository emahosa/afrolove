
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, DollarSign, TrendingUp, BarChart, Eye, MousePointer } from "lucide-react";
import { toast } from 'sonner';
import AffiliateLinks from '@/components/affiliate/AffiliateLinks';
import EarningsBreakdown from '@/components/affiliate/EarningsBreakdown';
import ReferralsList from '@/components/affiliate/ReferralsList';
import PayoutHistory from '@/components/affiliate/PayoutHistory';
import AffiliateWalletComponent from '@/components/affiliate/AffiliateWallet';
import { useAffiliateStats } from '@/hooks/useAffiliateStats';
import { useAffiliateTracking } from '@/hooks/useAffiliateTracking';

interface AffiliateApplication {
  id: string;
  status: string;
  created_at: string;
  rejection_date?: string;
}

const AffiliateDashboard: React.FC = () => {
  const { user, isAffiliate } = useAuth();
  const [application, setApplication] = useState<AffiliateApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const { stats, loading: statsLoading, error: statsError, refetch } = useAffiliateStats(user?.id || null);
  const { trackActivity } = useAffiliateTracking();

  useEffect(() => {
    if (user) {
      fetchApplicationStatus();
    }
  }, [user]);

  const fetchApplicationStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('affiliate_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setApplication(data[0]);
      }
    } catch (error: any) {
      console.error('Error fetching application status:', error);
      toast.error('Failed to load application status');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please log in to access the affiliate dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Check if user is approved affiliate
  if (!isAffiliate() || !application || application.status !== 'approved') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Users className="h-6 w-6" />
              Affiliate Application Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!application ? (
              <div className="text-center">
                <p className="text-gray-600 mb-4">You haven't applied for the affiliate program yet.</p>
                <Button onClick={() => window.location.href = '/affiliate'}>
                  Apply Now
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <div className="mb-4">
                  <Badge 
                    variant={
                      application.status === 'approved' ? 'default' :
                      application.status === 'rejected' ? 'destructive' :
                      'outline'
                    }
                  >
                    {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                  </Badge>
                </div>
                
                {application.status === 'pending' && (
                  <p className="text-gray-600">
                    Your affiliate application is under review. We'll notify you once it's processed.
                  </p>
                )}
                
                {application.status === 'rejected' && (
                  <div>
                    <p className="text-gray-600 mb-2">
                      Your affiliate application was rejected.
                    </p>
                    {application.rejection_date && (
                      <p className="text-sm text-gray-500">
                        Rejected on: {new Date(application.rejection_date).toLocaleDateString()}
                      </p>
                    )}
                    <Button 
                      className="mt-4" 
                      onClick={() => window.location.href = '/affiliate'}
                    >
                      Apply Again
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Affiliate Dashboard</h1>
        <p className="text-gray-600">Track your referrals, earnings, and performance</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? '...' : stats.totalReferrals}</div>
            <p className="text-xs text-muted-foreground">All time referrals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${statsLoading ? '...' : stats.totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Lifetime earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Link Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? '...' : stats.clicksCount}</div>
            <p className="text-xs text-muted-foreground">Total clicks on your links</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? '...' : stats.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Clicks to signups</p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Free Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600">{stats.activeReferrals}</div>
            <p className="text-xs text-muted-foreground">Earning $0.10 each</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Subscription Commissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-600">${stats.subscriptionCommissions.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">10% commission earned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-orange-600">${stats.pendingEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="links">My Links</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6">
            <EarningsBreakdown affiliateId={user.id} />
            <AffiliateLinks affiliateId={user.id} />
          </div>
        </TabsContent>

        <TabsContent value="links">
          <AffiliateLinks affiliateId={user.id} />
        </TabsContent>

        <TabsContent value="referrals">
          <ReferralsList affiliateId={user.id} />
        </TabsContent>

        <TabsContent value="earnings">
          <div className="space-y-6">
            <EarningsBreakdown affiliateId={user.id} />
            <PayoutHistory affiliateId={user.id} />
          </div>
        </TabsContent>

        <TabsContent value="wallet">
          <AffiliateWalletComponent affiliateId={user.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AffiliateDashboard;
