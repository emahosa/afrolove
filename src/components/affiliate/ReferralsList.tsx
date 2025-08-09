
import React, { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { AffiliateEarning } from '@/types/affiliate';

interface ReferralsListProps {
  earnings: AffiliateEarning[];
}

const ReferralsList: React.FC<ReferralsListProps> = ({ earnings = [] }) => {
  const referredUsers = useMemo(() => {
    const usersMap = new Map<string, any>();
    earnings.forEach(earning => {
      if (earning.referred_user_id && !usersMap.has(earning.referred_user_id)) {
        usersMap.set(earning.referred_user_id, {
          id: earning.referred_user_id,
          full_name: earning.profile?.full_name,
          created_at: earning.created_at, // This is the earning date, not registration date
          status: 'Referred' // Simplified status
        });
      }
    });
    return Array.from(usersMap.values());
  }, [earnings]);

  if (referredUsers.length === 0) {
    return (
       <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5" /> My Referrals</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="p-4 text-center text-muted-foreground">You haven't referred any users yet, or your referrals haven't generated any earnings.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5" /> My Referrals ({referredUsers.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Name</TableHead>
              <TableHead>Date of First Earning</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {referredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.full_name || 'N/A'}</TableCell>
                <TableCell>{format(parseISO(user.created_at), 'MMM d, yyyy')}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {user.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ReferralsList;
