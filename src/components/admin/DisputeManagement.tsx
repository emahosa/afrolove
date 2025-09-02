import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const fetchDisputes = async () => {
  const { data, error } = await supabase
    .from('disputes')
    .select(`
      id,
      created_at,
      status,
      rejection_reason,
      request:request_id (
        id,
        user:user_id ( full_name, email ),
        producer:producer_id ( full_name, email )
      )
    `)
    .eq('status', 'open');

  if (error) throw new Error(error.message);
  return data;
};

export const DisputeManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: disputes, isLoading, error } = useQuery({
    queryKey: ['disputes'],
    queryFn: fetchDisputes,
  });

  const resolveMutation = useMutation({
    mutationFn: ({ disputeId, resolution }: { disputeId: string, resolution: 'refund_user' | 'payout_producer' }) =>
      supabase.rpc('resolve_dispute', { p_dispute_id: disputeId, p_resolution: resolution }),
    onSuccess: (data, variables) => {
      if (data.error) {
        toast.error(`Failed to resolve dispute: ${(data.error as Error).message}`);
      } else {
        toast.success(`Dispute resolved. Action: ${variables.resolution}`);
        queryClient.invalidateQueries({ queryKey: ['disputes'] });
      }
    },
    onError: (err: Error) => toast.error(`Error: ${err.message}`),
  });

  if (isLoading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (error) return <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Request ID</TableHead>
          <TableHead>User</TableHead>
          <TableHead>Producer</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {disputes && disputes.length > 0 ? (
          disputes.map(d => (
            <TableRow key={d.id}>
              <TableCell className="font-mono text-xs">{d.request.id}</TableCell>
              <TableCell>{d.request.user.full_name}</TableCell>
              <TableCell>{d.request.producer.full_name}</TableCell>
              <TableCell className="max-w-xs truncate">{d.rejection_reason}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => resolveMutation.mutate({ disputeId: d.id, resolution: 'payout_producer' })} disabled={resolveMutation.isPending}>
                    Pay Producer
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => resolveMutation.mutate({ disputeId: d.id, resolution: 'refund_user' })} disabled={resolveMutation.isPending}>
                    Refund User
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={5} className="text-center">No open disputes.</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
