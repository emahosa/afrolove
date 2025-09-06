
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, TrendingUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { AffiliateEarning } from '@/types/affiliate';

interface EarningsBreakdownProps {
  affiliateId: string;
}

const EarningsBreakdown: React.FC<EarningsBreakdownProps> = ({ affiliateId }) => {
  const [earnings, setEarnings] = useState<AffiliateEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    free_referrals: { count: 0, total: 0 },
    commissions: { count: 0, total: 0 }
  });

  const fetchEarnings = async () => {
    try {
      // First fetch earnings
      const { data: earningsData, error: earningsError } = await supabase
        .from('affiliate_earnings')
        .select(`
          id,
          affiliate_user_id,
          referred_user_id,
          earning_type,
          amount,
          status,
          created_at,
          processed_at
        `)
        .eq('affiliate_user_id', affiliateId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (earningsError) {
        console.error('Error fetching earnings:', earningsError);
        return;
      }

      if (earningsData) {
        // Fetch profile data separately for each referred user
        const earningsWithProfiles = await Promise.all(
          earningsData.map(async (earning) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, username')
              .eq('id', earning.referred_user_id)
              .single();

            return {
              id: earning.id,
              affiliate_user_id: earning.affiliate_user_id,
              referred_user_id: earning.referred_user_id,
              earning_type: earning.earning_type as 'free_referral' | 'subscription_commission',
              amount: Number(earning.amount),
              status: earning.status,
              created_at: earning.created_at,
              processed_at: earning.processed_at,
              profile: {
                full_name: profile?.full_name || null,
                username: profile?.username || null
              }
            };
          })
        );
        
        setEarnings(earningsWithProfiles);

        // Calculate summary
        const freeReferrals = earningsWithProfiles.filter(e => e.earning_type === 'free_referral');
        const commissions = earningsWithProfiles.filter(e => e.earning_type === 'subscription_commission');

        setSummary({
          free_referrals: {
            count: freeReferrals.length,
            total: freeReferrals.reduce((sum, e) => sum + e.amount, 0)
          },
          commissions: {
            count: commissions.length,
            total: commissions.reduce((sum, e) => sum + e.amount, 0)
          }
        });
      }
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
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center"><TrendingUp className="mr-2 h-5 w-5" /> Earnings Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center p-10">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="flex items-center"><TrendingUp className="mr-2 h-5 w-5" /> Earnings Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card variant="glass" className="p-4 bg-green-500/10">
            <h3 className="text-sm font-medium text-gray-300">Free Referrals</h3>
            <p className="text-xl font-bold text-green-400">
              {summary.free_referrals.count} referrals
            </p>
            <p className="text-sm text-gray-400">
              ${summary.free_referrals.total.toFixed(2)} earned
            </p>
          </Card>
          <Card variant="glass" className="p-4 bg-blue-500/10">
            <h3 className="text-sm font-medium text-gray-300">Subscription Commissions</h3>
            <p className="text-xl font-bold text-blue-400">
              {summary.commissions.count} commissions
            </p>
            <p className="text-sm text-gray-400">
              ${summary.commissions.total.toFixed(2)} earned
            </p>
          </Card>
        </div>

        {/* Earnings Table */}
        {earnings.length > 0 ? (
          <div className="p-4 rounded-lg bg-black/20">
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
                      <Badge variant="glass" className={earning.earning_type === 'free_referral' ? 'bg-green-500/20 text-green-300' : 'bg-blue-500/20 text-blue-300'}>
                        {earning.earning_type === 'free_referral' ? 'Free Referral' : 'Commission'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      ${earning.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="glass" className={earning.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-300'}>
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
