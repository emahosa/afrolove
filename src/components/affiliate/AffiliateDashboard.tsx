
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Copy, DollarSign, Users, TrendingUp, Calendar, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface AffiliateData {
  id: string;
  affiliate_code: string;
  referral_link: string;
  total_earnings: number;
  pending_withdrawals: number;
  total_withdrawals: number;
}

interface ReferralData {
  id: string;
  referred_user_id: string;
  referral_code: string;
  is_converted: boolean;
  conversion_date: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    username: string;
  };
  user_roles: {
    role: string;
  }[];
}

interface CommissionData {
  id: string;
  commission_amount: number;
  payment_month: number;
  payment_year: number;
  status: string;
  created_at: string;
}

const AffiliateDashboard = () => {
  const { user } = useAuth();
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null);
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [commissions, setCommissions] = useState<CommissionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [bankDetails, setBankDetails] = useState('');

  useEffect(() => {
    loadAffiliateData();
  }, [user]);

  const loadAffiliateData = async () => {
    if (!user) return;

    try {
      // Load affiliate info
      const { data: affiliate, error: affiliateError } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (affiliateError) throw affiliateError;
      setAffiliateData(affiliate);

      // Load referrals with proper join
      const { data: referralsData, error: referralsError } = await supabase
        .from('referrals')
        .select(`
          *,
          profiles!referrals_referred_user_id_fkey (full_name, username)
        `)
        .eq('referrer_id', affiliate.id)
        .order('created_at', { ascending: false });

      if (referralsError) throw referralsError;

      // Get user roles separately for each referral
      const referralsWithRoles = await Promise.all((referralsData || []).map(async (referral) => {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', referral.referred_user_id);
        
        return {
          ...referral,
          user_roles: roles || []
        };
      }));

      setReferrals(referralsWithRoles);

      // Load commissions
      const { data: commissionsData, error: commissionsError } = await supabase
        .from('affiliate_commissions')
        .select('*')
        .eq('affiliate_id', affiliate.id)
        .order('created_at', { ascending: false });

      if (commissionsError) throw commissionsError;
      setCommissions(commissionsData || []);

    } catch (error: any) {
      console.error('Error loading affiliate data:', error);
      toast.error('Failed to load affiliate data');
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (affiliateData) {
      navigator.clipboard.writeText(affiliateData.referral_link);
      toast.success('Referral link copied to clipboard!');
    }
  };

  const requestWithdrawal = async () => {
    if (!affiliateData || !withdrawalAmount || !bankDetails) {
      toast.error('Please fill in all withdrawal details');
      return;
    }

    const amount = parseFloat(withdrawalAmount);
    if (amount > affiliateData.total_earnings - affiliateData.pending_withdrawals) {
      toast.error('Insufficient balance for withdrawal');
      return;
    }

    try {
      const { error } = await supabase
        .from('affiliate_withdrawals')
        .insert({
          affiliate_id: affiliateData.id,
          amount: amount,
          bank_details: { details: bankDetails }
        });

      if (error) throw error;

      toast.success('Withdrawal request submitted successfully!');
      setWithdrawalAmount('');
      setBankDetails('');
      loadAffiliateData(); // Refresh data
    } catch (error: any) {
      console.error('Error requesting withdrawal:', error);
      toast.error('Failed to submit withdrawal request');
    }
  };

  const totalReferrals = referrals.length;
  const convertedReferrals = referrals.filter(r => r.is_converted).length;
  const subscriberReferrals = referrals.filter(r => 
    r.user_roles.some(role => role.role === 'subscriber')
  ).length;

  const availableBalance = affiliateData 
    ? affiliateData.total_earnings - affiliateData.pending_withdrawals - affiliateData.total_withdrawals
    : 0;

  const monthlyEarnings = commissions.reduce((acc, commission) => {
    const key = `${commission.payment_year}-${commission.payment_month.toString().padStart(2, '0')}`;
    acc[key] = (acc[key] || 0) + commission.commission_amount;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!affiliateData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You don't have access to the affiliate dashboard. Please apply to become an affiliate first.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Affiliate Dashboard</h1>
        <p className="text-muted-foreground">Track your referrals and earnings</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReferrals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Converted</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{convertedReferrals}</div>
            <p className="text-xs text-muted-foreground">
              {totalReferrals > 0 ? ((convertedReferrals / totalReferrals) * 100).toFixed(1) : 0}% conversion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${affiliateData.total_earnings.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${availableBalance.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Referral Link</CardTitle>
                <CardDescription>Share this link to earn commissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input 
                    value={affiliateData.referral_link} 
                    readOnly 
                    className="flex-1"
                  />
                  <Button onClick={copyReferralLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Affiliate Code: <code className="bg-muted px-2 py-1 rounded">{affiliateData.affiliate_code}</code>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Earnings</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(monthlyEarnings).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(monthlyEarnings)
                      .sort(([a], [b]) => b.localeCompare(a))
                      .slice(0, 6)
                      .map(([month, earnings]) => (
                        <div key={month} className="flex justify-between items-center">
                          <span className="text-sm">{month}</span>
                          <span className="font-medium">${earnings.toFixed(2)}</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No earnings yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="referrals">
          <Card>
            <CardHeader>
              <CardTitle>Your Referrals</CardTitle>
              <CardDescription>Users who signed up through your referral link</CardDescription>
            </CardHeader>
            <CardContent>
              {referrals.length > 0 ? (
                <div className="space-y-4">
                  {referrals.map((referral) => (
                    <div key={referral.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{referral.profiles.full_name || referral.profiles.username}</p>
                        <p className="text-sm text-muted-foreground">
                          Signed up: {new Date(referral.created_at).toLocaleDateString()}
                        </p>
                        {referral.conversion_date && (
                          <p className="text-sm text-muted-foreground">
                            Converted: {new Date(referral.conversion_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant={referral.is_converted ? "default" : "secondary"}>
                          {referral.is_converted ? "Converted" : "Pending"}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {referral.user_roles.map(r => r.role).join(', ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No referrals yet. Start sharing your link!</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="earnings">
          <Card>
            <CardHeader>
              <CardTitle>Commission History</CardTitle>
              <CardDescription>Your commission earnings from referrals</CardDescription>
            </CardHeader>
            <CardContent>
              {commissions.length > 0 ? (
                <div className="space-y-4">
                  {commissions.map((commission) => (
                    <div key={commission.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">${commission.commission_amount.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">
                          {commission.payment_month}/{commission.payment_year}
                        </p>
                      </div>
                      <Badge variant={commission.status === 'paid' ? 'default' : 'secondary'}>
                        {commission.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No commissions earned yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdraw">
          <Card>
            <CardHeader>
              <CardTitle>Request Withdrawal</CardTitle>
              <CardDescription>
                Available balance: ${availableBalance.toFixed(2)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Withdrawal Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  max={availableBalance}
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankDetails">Bank Details</Label>
                <Textarea
                  id="bankDetails"
                  value={bankDetails}
                  onChange={(e) => setBankDetails(e.target.value)}
                  placeholder="Enter your bank account details, PayPal email, or other payment information"
                  rows={4}
                />
              </div>

              <Button 
                onClick={requestWithdrawal}
                disabled={!withdrawalAmount || !bankDetails || parseFloat(withdrawalAmount) > availableBalance}
                className="w-full"
              >
                Request Withdrawal
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AffiliateDashboard;
