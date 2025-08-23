
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wallet, DollarSign, TrendingUp, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { AffiliateWalletExtended } from '@/types/affiliate-local';

interface AffiliateWalletProps {
  wallet: AffiliateWalletExtended | null;
  onWithdrawal: () => void;
}

const AffiliateWalletComponent: React.FC<AffiliateWalletProps> = ({ wallet, onWithdrawal }) => {
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const usdtAddress = wallet?.usdt_wallet_address || '';

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

    if (!wallet || amount > (wallet.balance || wallet.pending_balance)) {
      toast.error("Insufficient balance");
      return;
    }

    if (amount < 50) {
      toast.error("Minimum withdrawal amount is $50.00");
      return;
    }

    setIsWithdrawing(true);
    try {
      const { error } = await supabase.functions.invoke('request-affiliate-payout', {
        body: {
          requested_amount: amount
        }
      });

      if (error) {
        toast.error(error.message || "Failed to request withdrawal");
      } else {
        toast.success("Withdrawal request submitted successfully");
        setWithdrawalAmount('');
        onWithdrawal();
      }
    } catch (err: any) {
      toast.error("An error occurred while requesting withdrawal");
      console.error('Withdrawal error:', err);
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (!wallet) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Wallet className="mr-2 h-5 w-5" /> Affiliate Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Wallet information not available.</p>
        </CardContent>
      </Card>
    );
  }

  const balance = wallet.balance || wallet.pending_balance || 0;
  const totalEarned = Number(wallet?.lifetime_earnings) || 0;
  const totalWithdrawn = Number(wallet?.paid_balance) || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${balance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Ready for withdrawal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalEarned.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Lifetime earnings</p>
          </CardContent>
        </Card>

        <Card>
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

      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Registered USDT Wallet Address (TRC20)</label>
            <Input
              type="text"
              value={usdtAddress}
              readOnly
              className="bg-gray-100 text-gray-700"
            />
            <p className="text-xs text-muted-foreground">
              This is your registered wallet address from your affiliate application. Contact support to change it.
            </p>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button disabled={balance < 50} className="w-full">
                Request Withdrawal
              </Button>
            </DialogTrigger>
            <DialogContent>
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
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum withdrawal: $50.00 | Available: ${balance.toFixed(2)}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">USDT Wallet Address</label>
                  <Input
                    type="text"
                    value={usdtAddress}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> A 10% processing fee will be deducted from your withdrawal.
                    Funds will be sent to your registered USDT wallet address.
                  </p>
                </div>
                
                <Button 
                  onClick={handleWithdrawal} 
                  disabled={isWithdrawing || !withdrawalAmount || !usdtAddress}
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
