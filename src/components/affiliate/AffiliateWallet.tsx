import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wallet, DollarSign, TrendingUp, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { AffiliateWallet } from '@/types/affiliate';

interface AffiliateWalletProps {
  affiliateId: string;
}

const AffiliateWalletComponent: React.FC<AffiliateWalletProps> = ({ affiliateId }) => {
  const [wallet, setWallet] = useState<AffiliateWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [usdtAddress, setUsdtAddress] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const fetchWallet = async () => {
    try {
      // First try to get existing wallet
      let { data: walletData, error: walletError } = await supabase
        .from('affiliate_wallets')
        .select('*')
        .eq('affiliate_user_id', affiliateId)
        .single();

      if (walletError && walletError.code === 'PGRST116') {
        // No wallet found, get USDT address from affiliate application
        const { data: applicationData } = await supabase
          .from('affiliate_applications')
          .select('usdt_wallet_address')
          .eq('user_id', affiliateId)
          .eq('status', 'approved')
          .single();

        if (applicationData?.usdt_wallet_address) {
          // Create wallet with the registered USDT address
          const { data: newWallet, error: createError } = await supabase
            .from('affiliate_wallets')
            .insert({
              affiliate_user_id: affiliateId,
              usdt_wallet_address: applicationData.usdt_wallet_address,
              balance: 0,
              total_earned: 0,
              total_withdrawn: 0
            })
            .select()
            .single();

          if (!createError && newWallet) {
            walletData = newWallet;
          }
        }
      }

      if (walletData) {
        setWallet(walletData);
        if (walletData.usdt_wallet_address) {
          setUsdtAddress(walletData.usdt_wallet_address);
        }
      }
    } catch (err) {
      console.error('Error fetching wallet:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (affiliateId) {
      fetchWallet();
    }
  }, [affiliateId]);

  const handleWithdrawal = async () => {
    if (!withdrawalAmount || !usdtAddress) {
      toast.error("Please enter withdrawal amount and USDT address");
      return;
    }

    const amount = parseFloat(withdrawalAmount);
    if (amount <= 0) {
      toast.error("Please enter a valid withdrawal amount");
      return;
    }

    if (!wallet || amount > Number(wallet.balance)) {
      toast.error("Insufficient balance");
      return;
    }

    setIsWithdrawing(true);
    try {
      const { error } = await supabase.functions.invoke('request-affiliate-withdrawal', {
        body: {
          requested_amount: amount,
          usdt_wallet_address: usdtAddress
        }
      });

      if (error) {
        toast.error(error.message || "Failed to request withdrawal");
      } else {
        toast.success("Withdrawal request submitted successfully");
        setWithdrawalAmount('');
        fetchWallet();
      }
    } catch (err: any) {
      toast.error("An error occurred while requesting withdrawal");
      console.error('Withdrawal error:', err);
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Wallet className="mr-2 h-5 w-5" /> Affiliate Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const balance = Number(wallet?.balance) || 0;
  const totalEarned = Number(wallet?.total_earned) || 0;
  const totalWithdrawn = Number(wallet?.total_withdrawn) || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${balance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Ready for withdrawal</p>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalEarned.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Lifetime earnings</p>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Withdrawn</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalWithdrawn.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Successfully withdrawn</p>
          </CardContent>
        </Card>
      </div>

      <Card variant="glass">
        <CardHeader>
          <CardTitle>Request Withdrawal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">USDT Wallet Address (TRC20)</label>
            <Input
              type="text"
              placeholder="Enter your USDT wallet address"
              value={usdtAddress}
              onChange={(e) => setUsdtAddress(e.target.value)}
              disabled={!!wallet?.usdt_wallet_address}
              className="bg-black/20 border-white/20 text-white placeholder-gray-500"
            />
            {wallet?.usdt_wallet_address && (
              <p className="text-xs text-muted-foreground">
                Using registered wallet address from your application
              </p>
            )}
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="glass" disabled={balance < 50} className="w-full">
                Request Withdrawal
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800/40 backdrop-blur-xl border-purple-500/20 text-white">
              <DialogHeader>
                <DialogTitle>Request Withdrawal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Withdrawal Amount (USD)</label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    max={balance}
                    min={50}
                    className="bg-black/20 border-white/20 text-white placeholder-gray-500"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum withdrawal: $50.00 | Available: ${balance.toFixed(2)}
                  </p>
                </div>
                
                <div className="bg-purple-500/20 p-3 rounded-lg border border-purple-500/50">
                  <p className="text-sm text-purple-300">
                    <strong>Note:</strong> A 10% processing fee will be deducted from your withdrawal.
                  </p>
                </div>
                
                <Button 
                  onClick={handleWithdrawal} 
                  disabled={isWithdrawing || !withdrawalAmount || !usdtAddress}
                  variant="glass"
                  className="w-full"
                >
                  {isWithdrawing ? 'Processing...' : 'Confirm Withdrawal'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          {balance < 50 && (
            <p className="text-sm text-muted-foreground">
              Minimum withdrawal amount is $50.00. Current balance: ${balance.toFixed(2)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AffiliateWalletComponent;
