
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Gift } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';

interface PayoutHistoryProps {
  affiliateId: string;
}

interface PayoutRequest {
  id: string;
  requested_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  requested_at: string;
  processed_at?: string | null;
  admin_notes?: string | null;
}

const PayoutHistory: React.FC<PayoutHistoryProps> = ({ affiliateId }) => {
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);

  const fetchPayoutHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from('affiliate_payout_requests')
        .select('*')
        .eq('affiliate_user_id', affiliateId)
        .order('created_at', { ascending: false });

      if (dbError) {
        throw new Error(`Failed to fetch payout history: ${dbError.message}`);
      }

      const typedData: PayoutRequest[] = (data || []).map(item => ({
        ...item,
        status: item.status as 'pending' | 'approved' | 'rejected' | 'paid'
      }));

      setPayoutRequests(typedData);
      setTotalItems(data?.length || 0);

    } catch (err: any) {
      console.error("Error in fetchPayoutHistory:", err);
      setError(err.message || "An unexpected error occurred while fetching payout history.");
      setPayoutRequests([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [affiliateId]);

  useEffect(() => {
    if (affiliateId) {
      fetchPayoutHistory();
    }
  }, [affiliateId, fetchPayoutHistory]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  if (loading && !payoutRequests.length) {
     return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Gift className="mr-2 h-5 w-5" /> Payout History</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center p-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading payout history...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Gift className="mr-2 h-5 w-5" /> Payout History</CardTitle>
        </CardHeader>
        <CardContent className="text-red-600 p-4 bg-red-100 border border-red-300 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />Error: {error}
        </CardContent>
      </Card>
    );
  }

  if (payoutRequests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Gift className="mr-2 h-5 w-5" /> Payout History</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="p-4 text-center text-muted-foreground">You have no payout requests yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><Gift className="mr-2 h-5 w-5" /> Payout History</CardTitle>
        <CardDescription>View the status and details of your payout requests.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Requested Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested Date</TableHead>
              <TableHead>Processed Date</TableHead>
              <TableHead>Admin Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payoutRequests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>{formatCurrency(Number(request.requested_amount))}</TableCell>
                <TableCell>
                  <Badge variant={
                    request.status === 'paid' || request.status === 'approved' ? 'default' :
                    request.status === 'rejected' ? 'destructive' :
                    'outline'
                  }>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>{format(parseISO(request.requested_at), 'MMM d, yyyy HH:mm')}</TableCell>
                <TableCell>
                  {request.processed_at ? format(parseISO(request.processed_at), 'MMM d, yyyy HH:mm') : 'N/A'}
                </TableCell>
                <TableCell className="max-w-xs truncate" title={request.admin_notes || undefined}>
                  {request.admin_notes || 'N/A'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default PayoutHistory;
