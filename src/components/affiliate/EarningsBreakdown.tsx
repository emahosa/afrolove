
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, TrendingUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Earning {
  id: string;
  referred_user_id: string;
  earning_type: 'free_referral' | 'subscription_commission';
  amount: number;
  status: string;
  created_at: string;
  profile?: {
    full_name?: string;
    username?: string;
  };
}

interface EarningsBreakdownProps {
  affiliateId: string;
}

const EarningsBreakdown: React.FC<EarningsBreakdownProps> = ({ affiliateId }) => {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    free_referrals: { count: 0, total: 0 },
    commissions: { count: 0, total: 0 }
  });

  const fetchEarnings = async () => {
    try {
      const { data, error } = await supabase
        .from('affiliate_earnings')
        .select(`
          *,
          profile:profiles!referred_user_id(full_name, username)
        `)
        .eq('affiliate_user_id', affiliateId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching earnings:', error);
        return;
      }

      setEarnings(data || []);

      // Calculate summary
      const freeReferrals = data?.filter(e => e.earning_type === 'free_referral') || [];
      const commissions = data?.filter(e => e.earning_type === 'subscription_commission') || [];

      setSummary({
        free_referrals: {
          count: freeReferrals.length,
          total: freeReferrals.reduce((sum, e) => sum + parseFloat(e.amount), 0)
        },
        commissions: {
          count: commissions.length,
          total: commissions.reduce((sum, e) => sum + parseFloat(e.amount), 0)
        }
      });

    } catch (err) {
      console.error('Error fetching earnings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (affiliateId) {
      fetchEarnings();
    }
  }, [affiliateId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><TrendingUp className="mr-2 h-5 w-5" /> Earnings Breakdown</CardTitle>
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
        <CardTitle className="flex items-center"><TrendingUp className="mr-2 h-5 w-5" /> Earnings Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-600">Free Referrals</h3>
            <p className="text-xl font-bold text-green-600">
              {summary.free_referrals.count} referrals
            </p>
            <p className="text-sm text-gray-600">
              ${summary.free_referrals.total.toFixed(2)} earned
            </p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-600">Subscription Commissions</h3>
            <p className="text-xl font-bold text-blue-600">
              {summary.commissions.count} commissions
            </p>
            <p className="text-sm text-gray-600">
              ${summary.commissions.total.toFixed(2)} earned
            </p>
          </div>
        </div>

        {/* Earnings Table */}
        {earnings.length > 0 ? (
          <div>
            <h3 className="text-lg font-semibold mb-4">Recent Earnings</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earnings.map((earning) => (
                  <TableRow key={earning.id}>
                    <TableCell>
                      {format(parseISO(earning.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {earning.profile?.full_name || earning.profile?.username || 'Unknown User'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={earning.earning_type === 'free_referral' ? 'outline' : 'default'}>
                        {earning.earning_type === 'free_referral' ? 'Free Referral' : 'Commission'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      ${parseFloat(earning.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={earning.status === 'pending' ? 'outline' : 'default'}>
                        {earning.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No earnings recorded yet. Start sharing your affiliate links to earn commissions!
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default EarningsBreakdown;
