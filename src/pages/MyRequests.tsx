import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

const fetchUserRequests = async (userId: string) => {
  const { data, error } = await supabase
    .from('reproduction_requests')
    .select(`
      id,
      created_at,
      status,
      price_in_credits,
      producer:profiles!reproduction_requests_producer_id_fkey(full_name)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

const MyRequests: React.FC = () => {
  const { user } = useAuth();
  const { data: requests, isLoading, error } = useQuery({
    queryKey: ['myRequests', user?.id],
    queryFn: () => fetchUserRequests(user!.id),
    enabled: !!user,
  });

  if (isLoading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (error) return <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>;

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>My Reproduction Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producer</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests && requests.length > 0 ? (
                requests.map(req => (
                  <TableRow key={req.id}>
                    <TableCell>{req.producer?.full_name || 'N/A'}</TableCell>
                    <TableCell>{new Date(req.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{req.price_in_credits} credits</TableCell>
                    <TableCell><Badge>{req.status}</Badge></TableCell>
                    <TableCell>
                      <Link to={`/requests/${req.id}`} className="text-blue-500 hover:underline">
                        View Details
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">You haven't made any requests yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyRequests;
