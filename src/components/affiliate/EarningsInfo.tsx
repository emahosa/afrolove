import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, AlertCircle, DollarSign, TrendingUp, Wallet } from 'lucide-react';
import { toast } from 'sonner';

interface EarningsInfoProps {
  affiliateId: string;
}

interface EarningsData {
  totalEarned: number;
  availableBalance: number;
  pendingPayouts: number;
  totalPaidOut: number;
  thisMonthEarnings: number;
}

const EarningsInfo: React.FC<EarningsInfoProps> = ({ affiliateId }) => {
  const [earnings, setEarnings] = useState<EarningsData>({
    totalEarned: 0,
    availableBalance: 0,
    pendingPayouts: 0,
    totalPaidOut: 0,
    thisMonthEarnings: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestAmount, setRequestAmount] = useState('');
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchEarnings = useCallback(async () => {
    setLoading(false);
    setError(null);
    // Temporarily disabled due to schema issues
    console.log('EarningsInfo temporarily disabled - schema mismatch');
  }, [affiliateId]);

  useEffect(() => {
    if (affiliateId) {
      fetchEarnings();
    }
  }, [affiliateId, fetchEarnings]);

  const handleRequestPayout = async () => {
    const amount = parseFloat(requestAmount);
    
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    if (amount > earnings.availableBalance) {
      toast.error("Requested amount exceeds available balance.");
      return;
    }

    if (amount < 10) {
      toast.error("Minimum payout amount is $10.");
      return;
    }

    setRequestingPayout(true);
    try {
      const { error } = await supabase.functions.invoke('request-affiliate-payout', {
        body: { requested_amount: amount },
      });

      if (error) throw error;

      toast.success("Payout request submitted successfully!");
      setRequestAmount('');
      setIsDialogOpen(false);
      fetchEarnings();
    } catch (err: any) {
      console.error("Error requesting payout:", err);
      toast.error(err.message || "Failed to request payout.");
    } finally {
      setRequestingPayout(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  if (loading && earnings.totalEarned === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><DollarSign className="mr-2 h-5 w-5" /> Earnings Overview</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center p-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading earnings...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><DollarSign className="mr-2 h-5 w-5" /> Earnings Overview</CardTitle>
        </CardHeader>
        <CardContent className="text-red-600 p-4 bg-red-100 border border-red-300 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />Error: {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <DollarSign className="mr-2 h-5 w-5" /> Earnings Overview
        </CardTitle>
        <CardDescription>Track your affiliate commissions and manage payouts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Total Earned</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(earnings.totalEarned)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Available Balance</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(earnings.availableBalance)}</p>
              </div>
              <Wallet className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Pending Payouts</p>
                <p className="text-2xl font-bold text-yellow-700">{formatCurrency(earnings.pendingPayouts)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">This Month</p>
                <p className="text-2xl font-bold text-purple-700">{formatCurrency(earnings.thisMonthEarnings)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="w-full md:w-auto" 
                disabled={earnings.availableBalance < 10}
              >
                Request Payout
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Payout</DialogTitle>
                <DialogDescription>
                  Enter the amount you'd like to withdraw. Minimum payout is $10.
                  Available balance: {formatCurrency(earnings.availableBalance)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="amount">Payout Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={requestAmount}
                    onChange={(e) => setRequestAmount(e.target.value)}
                    min="10"
                    max={earnings.availableBalance}
                    step="0.01"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleRequestPayout} disabled={requestingPayout}>
                  {requestingPayout ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Request Payout
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {earnings.availableBalance < 10 && (
          <p className="text-sm text-muted-foreground text-center mt-2">
            Minimum payout amount is $10. Keep earning to unlock payouts!
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default EarningsInfo;
