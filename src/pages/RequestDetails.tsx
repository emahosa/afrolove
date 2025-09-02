import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';


const fetchRequestDetails = async (requestId: string) => {
  const { data, error } = await supabase
    .from('reproduction_requests')
    .select(`
      *,
      producer:profiles!reproduction_requests_producer_id_fkey(
        full_name,
        email
      )
    `)
    .eq('id', requestId)
    .single();

  if (error) throw new Error(error.message);
  return data;
};

const getFinalTrackUrl = async (path: string) => {
    const { data, error } = await supabase.storage
        .from('final-tracks')
        .createSignedUrl(path, 3600); // URL valid for 1 hour
    if (error) throw new Error(error.message);
    return data.signedUrl;
};

const RequestDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: request, isLoading, error } = useQuery({
    queryKey: ['requestDetails', id],
    queryFn: () => fetchRequestDetails(id!),
    enabled: !!id && !!user,
  });

  const reviewMutation = useMutation({
      mutationFn: ({ action, reason }: { action: 'accepted' | 'revision_requested' | 'rejected', reason?: string }) =>
          supabase.rpc('review_final_track', {
              p_request_id: id!,
              p_review_action: action,
              p_rejection_reason: reason
          }),
      onSuccess: (data, variables) => {
          if (data.error) {
              toast.error(`Action failed: ${(data.error as Error).message}`);
          } else {
              toast.success(`Request has been ${variables.action}.`);
              queryClient.invalidateQueries({ queryKey: ['requestDetails', id] });
          }
      },
      onError: (err: Error) => toast.error(`Error: ${err.message}`),
  });

  const handleDownload = async () => {
      if (!request?.final_track_url) return;
      try {
          const url = await getFinalTrackUrl(request.final_track_url);
          window.open(url, '_blank');
      } catch (e) {
          toast.error(`Failed to get download link: ${(e as Error).message}`);
      }
  };

  if (isLoading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (error) return <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>;
  if (!request) return <p>Request not found.</p>;

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
          <CardDescription>Status: <Badge>{request.status}</Badge></CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p><strong>Producer:</strong> {request.producer?.full_name || request.producer?.email}</p>
          <p><strong>Price:</strong> {request.price_in_credits} credits</p>

          {request.status === 'pending_user_review' && request.final_track_url && (
            <div className="p-4 border rounded-lg">
              <h3 className="font-bold mb-2">Your track is ready for review!</h3>
              <p className="text-sm text-muted-foreground mb-4">Listen to the final version and either approve it to release payment to the producer, or request a revision with your feedback.</p>
              <div className="flex gap-4">
                <Button onClick={handleDownload}><Download className="h-4 w-4 mr-2" /> Download Final Track</Button>
                <Button variant="secondary" onClick={() => reviewMutation.mutate({ action: 'accepted' })} disabled={reviewMutation.isPending}>Accept & Complete</Button>
                <Button variant="outline" onClick={() => reviewMutation.mutate({ action: 'revision_requested' })} disabled={reviewMutation.isPending}>Request Revision</Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={reviewMutation.isPending}>Reject</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure you want to reject this track?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will open a dispute case for an admin to review. Please provide a clear reason for your rejection. Payment will be held until the dispute is resolved.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Textarea
                      placeholder="Type your reason for rejection here."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => reviewMutation.mutate({ action: 'rejected', reason: rejectionReason })}>
                        Submit Rejection
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

              </div>
            </div>
          )}

          {(request.status === 'rejected_by_user' || request.status === 'rejected_by_producer') && (
            <Alert variant="destructive">
              <AlertTitle>Request Rejected</AlertTitle>
              <AlertDescription>
                This request was rejected and is under review by an administrator.
              </AlertDescription>
            </Alert>
          )}

          {request.status === 'completed' && (
            <Alert variant="default">
              <AlertTitle>Request Completed!</AlertTitle>
              <AlertDescription>
                This request is complete. Payment has been released to the producer.
                {request.final_track_url && <Button variant="link" onClick={handleDownload}>Download your track again</Button>}
              </AlertDescription>
            </Alert>
          )}

        </CardContent>
      </Card>
    </div>
  );
};

export default RequestDetails;
