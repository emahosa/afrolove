import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DollarSign, TrendingUp, AlertCircle, Loader2, Send } from 'lucide-react';
import { format, startOfMonth, isSameMonth } from 'date-fns';

interface EarningsInfoProps {
  affiliateId: string;
}

interface Commission {
  amount_earned: number;
  commission_month: string; // YYYY-MM-DD
}

interface PayoutRequest {
  requested_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
}

const MINIMUM_PAYOUT_THRESHOLD = parseFloat(process.env.NEXT_PUBLIC_MINIMUM_PAYOUT_THRESHOLD || "10");


const EarningsInfo: React.FC<EarningsInfoProps> = ({ affiliateId }) => {
  const [totalEarned, setTotalEarned] = useState(0);
  const [currentMonthEarned, setCurrentMonthEarned] = useState(0);
  const [pendingPayouts, setPendingPayouts] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);

  const fetchEarningsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all commissions
      const { data: commissionsData, error: commissionsError } = await supabase
        .from('affiliate_commissions')
        .select('amount_earned, commission_month')
        .eq('affiliate_user_id', affiliateId);

      if (commissionsError) throw new Error(`Fetching commissions: ${commissionsError.message}`);

      const total = commissionsData?.reduce((sum, r) => sum + Number(r.amount_earned), 0) || 0;
      setTotalEarned(total);

      const today = new Date();
      const currentMonth = commissionsData
        ?.filter(r => isSameMonth(parseISO(r.commission_month), today))
        .reduce((sum, r) => sum + Number(r.amount_earned), 0) || 0;
      setCurrentMonthEarned(currentMonth);

      // Fetch all payout requests
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('affiliate_payout_requests')
        .select('requested_amount, status')
        .eq('affiliate_user_id', affiliateId);

      if (payoutsError) throw new Error(`Fetching payout requests: ${payoutsError.message}`);

      const pending = payoutsData
        ?.filter(p => p.status === 'pending' || p.status === 'approved')
        .reduce((sum, p) => sum + Number(p.requested_amount), 0) || 0;
      setPendingPayouts(pending);

      setAvailableBalance(total - pending);

    } catch (err: any) {
      console.error("Error fetching earnings data:", err);
      setError(err.message);
      setTotalEarned(0);
      setCurrentMonthEarned(0);
      setPendingPayouts(0);
      setAvailableBalance(0);
    } finally {
      setLoading(false);
    }
  }, [affiliateId]);

  useEffect(() => {
    if (affiliateId) {
      fetchEarningsData();
    }
  }, [affiliateId, fetchEarningsData]);

  const handlePayoutRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(payoutAmount);

    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid positive amount.");
      return;
    }
    if (amount > availableBalance) {
      toast.error("Requested amount exceeds available balance.");
      return;
    }
    if (amount < MINIMUM_PAYOUT_THRESHOLD) {
        toast.error(`Minimum payout amount is $${MINIMUM_PAYOUT_THRESHOLD.toFixed(2)}.`);
        return;
    }


    setPayoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('request-affiliate-payout', {
        body: { requested_amount: amount },
      });

      if (error) {
         const errMessage = error.context?.error_details || error.message || "Failed to request payout.";
         toast.error(errMessage, { description: error.context?.error });
      } else {
        toast.success(data?.message || "Payout request submitted successfully!");
        setPayoutAmount(''); // Clear input
        fetchEarningsData(); // Refresh earnings data
      }
    } catch (err: any) {
      console.error("Unexpected error requesting payout:", err);
      toast.error("An unexpected error occurred while requesting payout.");
    } finally {
      setPayoutLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  if (loading) {
    return (
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center"><DollarSign className="mr-2 h-5 w-5" />Earnings & Payout</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center p-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading earnings data...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center"><DollarSign className="mr-2 h-5 w-5" />Earnings & Payout</CardTitle>
        </CardHeader>
        <CardContent className="text-red-600 p-4 bg-red-100 border border-red-300 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />Error: {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center"><DollarSign className="mr-2 h-5 w-5" />Earnings & Payout</CardTitle>
        <CardDescription>View your earnings summary and request payouts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center md:text-left">
          <div>
            <p className="text-sm text-muted-foreground">Total Earned</p>
            <p className="text-2xl font-bold">{formatCurrency(totalEarned)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Earned This Month ({format(new Date(), 'MMMM')})</p>
            <p className="text-2xl font-bold">{formatCurrency(currentMonthEarned)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Available for Payout</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(availableBalance)}</p>
          </div>
        </div>
        <form onSubmit={handlePayoutRequest} className="space-y-4 pt-4 border-t">
          <div>
            <Label htmlFor="payoutAmount" className="text-base">Request Payout</Label>
            <div className="flex items-center space-x-2 mt-1">
              <Input
                id="payoutAmount"
                type="number"
                step="0.01"
                placeholder={`Min. ${formatCurrency(MINIMUM_PAYOUT_THRESHOLD)}`}
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                className="max-w-xs"
                disabled={payoutLoading || availableBalance < MINIMUM_PAYOUT_THRESHOLD}
              />
              <Button type="submit" disabled={payoutLoading || availableBalance < MINIMUM_PAYOUT_THRESHOLD || parseFloat(payoutAmount) > availableBalance}>
                {payoutLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                {payoutLoading ? 'Requesting...' : 'Request Payout'}
              </Button>
            </div>
            {availableBalance < MINIMUM_PAYOUT_THRESHOLD && (
                <p className="text-xs text-amber-600 mt-1">
                    You need at least {formatCurrency(MINIMUM_PAYOUT_THRESHOLD)} in available balance to request a payout.
                </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Pending payouts: {formatCurrency(pendingPayouts)}</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default EarningsInfo;
