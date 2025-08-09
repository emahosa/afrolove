
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { AffiliateEarning } from '@/types/affiliate';

interface EarningsBreakdownProps {
  earnings: AffiliateEarning[];
}

const EarningsBreakdown: React.FC<EarningsBreakdownProps> = ({ earnings = [] }) => {
  const summary = useMemo(() => {
    const freeReferrals = earnings.filter(e => e.type === 'free_referral');
    const commissions = earnings.filter(e => e.type === 'subscription');

    return {
      free_referrals: {
        count: freeReferrals.length,
        total: freeReferrals.reduce((sum, e) => sum + e.amount_earned, 0)
      },
      commissions: {
        count: commissions.length,
        total: commissions.reduce((sum, e) => sum + e.amount_earned, 0)
      }
    };
  }, [earnings]);

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
                      {earning.profile?.full_name || 'Unknown User'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={earning.type === 'free_referral' ? 'outline' : 'default'}>
                        {earning.type === 'free_referral' ? 'Free Referral' : 'Commission'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      ${earning.amount_earned.toFixed(2)}
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
