import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Download, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


// Assuming ReproductionRequest type is defined elsewhere or define it here
interface ReproductionRequest {
  id: string;
  created_at: string;
  status: string;
  price_in_credits: number;
  original_track_url: string;
  user_vocal_recording_url: string;
  // Assuming a join to get user info
  profiles: {
    full_name: string;
    email: string;
  } | null;
}

const fetchProducerRequests = async (producerId: string): Promise<ReproductionRequest[]> => {
  const { data, error } = await supabase
    .from('reproduction_requests')
    .select(`
      id,
      created_at,
      status,
      price_in_credits,
      original_track_url,
      user_vocal_recording_url,
      profiles!reproduction_requests_user_id_fkey (
        full_name,
        email
      )
    `)
    .eq('producer_id', producerId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data as ReproductionRequest[];
};

const ProducerDashboard: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: requests, isLoading, error } = useQuery({
    queryKey: ['producerRequests', user?.id],
    queryFn: () => fetchProducerRequests(user!.id),
    enabled: !!user,
  });

  const respondMutation = useMutation({
    mutationFn: ({ requestId, response }: { requestId: string, response: 'accepted' | 'declined' }) =>
      supabase.rpc('respond_to_reproduction_request', { p_request_id: requestId, p_response: response }),
    onSuccess: (data, variables) => {
      if (data.error) {
        toast.error(`Failed to respond: ${(data.error as Error).message}`);
      } else {
        toast.success(`Request ${variables.response}.`);
        queryClient.invalidateQueries({ queryKey: ['producerRequests'] });
      }
    },
    onError: (err: Error) => toast.error(`Error: ${err.message}`),
  });

  const submitMutation = useMutation({
      mutationFn: async ({ requestId, finalTrack }: { requestId: string, finalTrack: File }) => {
          // 1. Upload file
          const filePath = `${user!.id}/${requestId}/${finalTrack.name}`;
          const { error: uploadError } = await supabase.storage.from('final-tracks').upload(filePath, finalTrack);
          if (uploadError) throw new Error(uploadError.message);

          // 2. Call RPC
          const { error: rpcError } = await supabase.rpc('submit_final_track', { p_request_id: requestId, p_final_track_url: filePath });
          if (rpcError) {
              // Cleanup failed upload
              await supabase.storage.from('final-tracks').remove([filePath]);
              throw new Error(rpcError.message);
          }
      },
      onSuccess: () => {
          toast.success('Final track submitted!');
          queryClient.invalidateQueries({ queryKey: ['producerRequests'] });
      },
      onError: (err: Error) => toast.error(`Submission failed: ${err.message}`),
  });

  if (isLoading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (error) return <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>;

  const newRequests = requests?.filter(r => r.status === 'pending_producer_acceptance') || [];
  const inProgressRequests = requests?.filter(r => ['in_progress', 'revision_requested'].includes(r.status)) || [];
  const completedRequests = requests?.filter(r => r.status === 'completed') || [];

  const renderTable = (reqs: ReproductionRequest[], type: 'new' | 'in-progress' | 'completed') => (
      <Table>
          <TableHeader>
              <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Payout (Credits)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
              </TableRow>
          </TableHeader>
          <TableBody>
              {reqs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center">No requests in this category.</TableCell></TableRow>}
              {reqs.map(req => (
                  <TableRow key={req.id}>
                      <TableCell>{req.profiles?.full_name || req.profiles?.email}</TableCell>
                      <TableCell>{new Date(req.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{req.price_in_credits}</TableCell>
                      <TableCell><Badge>{req.status}</Badge></TableCell>
                      <TableCell>
                          {type === 'new' && (
                              <div className="flex gap-2">
                                  <Button size="sm" onClick={() => respondMutation.mutate({ requestId: req.id, response: 'accepted' })}>Accept</Button>
                                  <Button size="sm" variant="destructive" onClick={() => respondMutation.mutate({ requestId: req.id, response: 'declined' })}>Decline</Button>
                              </div>
                          )}
                          {type === 'in-progress' && (
                              <div className="flex gap-2">
                                  <Button size="sm" variant="outline"><Download className="h-4 w-4 mr-2" />Assets</Button>
                                  <input type="file" id={`upload-${req.id}`} className="hidden" onChange={(e) => {
                                      if (e.target.files?.[0]) {
                                          submitMutation.mutate({ requestId: req.id, finalTrack: e.target.files[0] });
                                      }
                                  }}/>
                                  <Button asChild size="sm" disabled={submitMutation.isPending}>
                                      <label htmlFor={`upload-${req.id}`}><Upload className="h-4 w-4 mr-2"/>Submit Final Track</label>
                                  </Button>
                              </div>
                          )}
                      </TableCell>
                  </TableRow>
              ))}
          </TableBody>
      </Table>
  );

  return (
      <div className="container mx-auto py-8">
          <Card>
              <CardHeader>
                  <CardTitle>Producer Dashboard</CardTitle>
                  <CardDescription>Manage your track reproduction requests.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Tabs defaultValue="new">
                      <TabsList>
                          <TabsTrigger value="new">New Requests ({newRequests.length})</TabsTrigger>
                          <TabsTrigger value="in-progress">In Progress ({inProgressRequests.length})</TabsTrigger>
                          <TabsTrigger value="completed">Completed ({completedRequests.length})</TabsTrigger>
                      </TabsList>
                      <TabsContent value="new">{renderTable(newRequests, 'new')}</TabsContent>
                      <TabsContent value="in-progress">{renderTable(inProgressRequests, 'in-progress')}</TabsContent>
                      <TabsContent value="completed">{renderTable(completedRequests, 'completed')}</TabsContent>
                  </Tabs>
              </CardContent>
          </Card>
      </div>
  );
};

export default ProducerDashboard;
