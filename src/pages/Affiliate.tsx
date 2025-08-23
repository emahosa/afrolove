import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Loader2, AlertCircle, Copy, DollarSign, Users, BarChart, ExternalLink } from 'lucide-react';

interface AffiliateDashboardData {
  code: string;
  wallet_trc20_usdt: string | null;
  clicks: number;
  free_referrals: number;
  free_earnings_usd: number;
  commission_earnings_usd: number;
  total_earnings_usd: number;
}

const StatCard = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

const AffiliateDashboardPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<AffiliateDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [isSavingWallet, setIsSavingWallet] = useState(false);

  const fetchDashboard = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_my_affiliate_dashboard');

      if (rpcError) {
        // It's possible the RPC returns an error if the user is not an affiliate (e.g., no rows found).
        // We'll treat this as "not an affiliate" rather than a hard error.
        console.log('Failed to fetch dashboard, user may not be an affiliate:', rpcError.message);
        setData(null);
      } else {
        setData(rpcData[0]);
        setWalletAddress(rpcData[0]?.wallet_trc20_usdt || '');
      }
    } catch (err: any) {
      setError('An unexpected error occurred.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchDashboard();
    }
  }, [authLoading, fetchDashboard]);

  const handleUpdateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingWallet(true);
    try {
      const { error } = await supabase
        .from('affiliates')
        .update({ wallet_trc20_usdt: walletAddress })
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Wallet address updated successfully!');
      setData(prev => prev ? { ...prev, wallet_trc20_usdt: walletAddress } : null);
    } catch (err: any) {
      toast.error(`Failed to update wallet: ${err.message}`);
    } finally {
      setIsSavingWallet(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Affiliate link copied to clipboard!');
  };

  if (loading || authLoading) {
    return (
      <div className="container mx-auto py-8 px-4 flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <CardDescription>{error}</CardDescription>
        </Alert>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl text-center">
        <Card>
          <CardHeader>
            <CardTitle>Affiliate Program</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">You are not currently an affiliate. Apply today to start earning!</p>
            <Link to="/become-affiliate">
              <Button>Become an Affiliate</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const affiliateLink = `${window.location.origin}/?ref=${data.code}`;

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">Affiliate Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's how your links are performing.</p>
        </div>
        <Card className="p-4">
          <Label htmlFor="affiliateLink" className="text-sm font-semibold">Your Affiliate Link</Label>
          <div className="flex items-center space-x-2 mt-2">
            <Input id="affiliateLink" value={affiliateLink} readOnly />
            <Button variant="outline" size="icon" onClick={() => copyToClipboard(affiliateLink)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Clicks" value={data.clicks} icon={ExternalLink} />
        <StatCard title="Free Referrals" value={data.free_referrals} icon={Users} />
        <StatCard title="Total Earnings" value={`$${data.total_earnings_usd.toFixed(2)}`} icon={DollarSign} />
        <StatCard title="Commission Earnings" value={`$${data.commission_earnings_usd.toFixed(2)}`} icon={BarChart} />
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payout Wallet</CardTitle>
            <CardDescription>Your earnings will be sent to this TRC20 USDT address.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateWallet} className="space-y-4">
              <div>
                <Label htmlFor="walletAddress">USDT Wallet Address (TRC20)</Label>
                <Input
                  id="walletAddress"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="Enter your TRC20 USDT wallet address"
                />
              </div>
              <Button type="submit" disabled={isSavingWallet}>
                {isSavingWallet ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Wallet'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Earnings Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex justify-between">
                <span className="text-muted-foreground">From Free Referrals</span>
                <span className="font-medium">${data.free_earnings_usd.toFixed(2)}</span>
             </div>
             <div className="flex justify-between">
                <span className="text-muted-foreground">From Commissions</span>
                <span className="font-medium">${data.commission_earnings_usd.toFixed(2)}</span>
             </div>
             <hr/>
             <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>${data.total_earnings_usd.toFixed(2)}</span>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AffiliateDashboardPage;
