
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Wallet, Download } from 'lucide-react';
import { toast } from 'sonner';

interface WalletData {
  balance: number;
  total_earned: number;
  total_withdrawn: number;
  usdt_wallet_address?: string;
}

interface AffiliateWalletProps {
  affiliateId: string;
}

const AffiliateWallet: React.FC<AffiliateWalletProps> = ({ affiliateId }) => {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [usdtAddress, setUsdtAddress] = useState('');
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [minWithdrawal, setMinWithdrawal] = useState(50);
  const [withdrawalFee, setWithdrawalFee] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchWallet = async () => {
    try {
      const { data, error } = await supabase
        .from('affiliate_wallets')
        .select('*')
        .eq('affiliate_user_id', affiliateId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching wallet:', error);
        return;
      }

      if (data) {
        setWallet(data);
        setUsdtAddress(data.usdt_wallet_address || '');
      } else {
        setWallet({ balance: 0, total_earned: 0, total_withdrawn: 0 });
      }
    } catch (err) {
      console.error('Error fetching wallet:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['affiliate_minimum_withdrawal', 'affiliate_withdrawal_fee_percent']);

      if (!error && data) {
        const settingsMap = new Map(data.map(s => [s.key, parseFloat(s.value)]));
        setMinWithdrawal(settingsMap.get('affiliate_minimum_withdrawal') || 50);
        setWithdrawalFee(settingsMap.get('affiliate_withdrawal_fee_percent') || 10);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  useEffect(() => {
    if (affiliateId) {
      fetchWallet();
      fetchSettings();
    }
  }, [affiliateId]);

  const handleWithdrawal = async () => {
    if (!withdrawAmount || !usdtAddress) {
      toast.error('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid withdrawal amount');
      return;
    }

    if (amount < minWithdrawal) {
      toast.error(`Minimum withdrawal amount is $${minWithdrawal}`);
      return;
    }

    if (wallet && amount > wallet.balance) {
      toast.error('Insufficient balance');
      return;
    }

    setWithdrawalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('request-affiliate-withdrawal', {
        body: {
          requested_amount: amount,
          usdt_wallet_address: usdtAddress
        }
      });

      if (error) {
        console.error('Withdrawal error:', error);
        throw error;
      }

      toast.success('Withdrawal request submitted successfully');
      setDialogOpen(false);
      setWithdrawAmount('');
      fetchWallet(); // Refresh wallet data
    } catch (err: any) {
      console.error('Withdrawal request failed:', err);
      toast.error(err.message || 'Failed to submit withdrawal request');
    } finally {
      setWithdrawalLoading(false);
    }
  };

  const calculateNetAmount = () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount)) return 0;
    const fee = (amount * withdrawalFee) / 100;
    return amount - fee;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Wallet className="mr-2 h-5 w-5" /> Affiliate Wallet</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center p-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><Wallet className="mr-2 h-5 w-5" /> Affiliate Wallet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-600">Available Balance</h3>
            <p className="text-2xl font-bold text-green-600">${wallet?.balance?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-600">Total Earned</h3>
            <p className="text-2xl font-bold text-blue-600">${wallet?.total_earned?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-600">Total Withdrawn</h3>
            <p className="text-2xl font-bold text-gray-600">${wallet?.total_withdrawn?.toFixed(2) || '0.00'}</p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="w-full" 
              disabled={!wallet || wallet.balance < minWithdrawal}
            >
              <Download className="mr-2 h-4 w-4" />
              Request Withdrawal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Withdrawal</DialogTitle>
              <DialogDescription>
                Minimum withdrawal: ${minWithdrawal}. Withdrawal fee: {withdrawalFee}%
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="withdraw-amount">Withdrawal Amount (USD)</Label>
                <Input
                  id="withdraw-amount"
                  type="number"
                  placeholder={`Min: ${minWithdrawal}`}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  min={minWithdrawal}
                  max={wallet?.balance || 0}
                />
                {withdrawAmount && (
                  <p className="text-sm text-gray-600 mt-1">
                    You will receive: ${calculateNetAmount().toFixed(2)} (after {withdrawalFee}% fee)
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="usdt-address">USDT Wallet Address</Label>
                <Input
                  id="usdt-address"
                  placeholder="Enter your USDT wallet address"
                  value={usdtAddress}
                  onChange={(e) => setUsdtAddress(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleWithdrawal} 
                disabled={withdrawalLoading}
                className="w-full"
              >
                {withdrawalLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Withdrawal Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {wallet && wallet.balance < minWithdrawal && (
          <p className="text-sm text-gray-500 text-center">
            Minimum withdrawal amount is ${minWithdrawal}. Current balance: ${wallet.balance.toFixed(2)}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default AffiliateWallet;
