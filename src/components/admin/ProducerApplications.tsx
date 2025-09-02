import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { ExternalLink, Loader2 } from 'lucide-react';

interface ProducerApplication {
  id: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  social_media_links: {
    instagram?: string;
    tiktok?: string;
    youtube?: string;
  };
  id_document_url: string;
  profiles: {
    full_name: string;
    email: string;
  } | null;
}

const fetchProducerApplications = async (): Promise<ProducerApplication[]> => {
  const { data, error } = await supabase
    .from('producer_applications')
    .select(`
      id,
      created_at,
      status,
      social_media_links,
      id_document_url,
      profiles:user_id (
        full_name,
        email
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data as ProducerApplication[];
};

const getSignedUrl = async (path: string) => {
  const { data, error } = await supabase.storage
    .from('producer-id-documents')
    .createSignedUrl(path, 60); // URL is valid for 60 seconds
  if (error) {
    throw new Error(error.message);
  }
  return data.signedUrl;
};

export const ProducerApplications: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: applications, isLoading, error } = useQuery({
    queryKey: ['producerApplications'],
    queryFn: fetchProducerApplications,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ applicationId, status }: { applicationId: string, status: 'approved' | 'rejected' }) =>
      supabase.functions.invoke('review-producer-application', {
        body: { application_id: applicationId, new_status: status },
      }),
    onSuccess: (data, variables) => {
      if (data.error) {
        toast.error(`Failed to update application: ${(data.error as Error).message}`);
      } else {
        toast.success(`Application has been ${variables.status}.`);
        queryClient.invalidateQueries({ queryKey: ['producerApplications'] });
      }
    },
    onError: (error: Error) => {
      toast.error(`An error occurred: ${error.message}`);
    },
  });

  const handleViewId = async (path: string) => {
    try {
      const url = await getSignedUrl(path);
      window.open(url, '_blank');
    } catch (error) {
      toast.error(`Could not open ID document: ${(error as Error).message}`);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!applications || applications.length === 0) {
    return <p>No producer applications found.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Applicant</TableHead>
          <TableHead>Socials</TableHead>
          <TableHead>Submitted</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {applications.map((app) => (
          <TableRow key={app.id}>
            <TableCell>
              <div>{app.profiles?.full_name || 'N/A'}</div>
              <div className="text-sm text-muted-foreground">{app.profiles?.email || 'N/A'}</div>
            </TableCell>
            <TableCell>
              <div className="flex space-x-2">
                {app.social_media_links?.instagram && <a href={app.social_media_links.instagram} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>}
                {app.social_media_links?.tiktok && <a href={app.social_media_links.tiktok} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>}
                {app.social_media_links?.youtube && <a href={app.social_media_links.youtube} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>}
              </div>
            </TableCell>
            <TableCell>{new Date(app.created_at).toLocaleDateString()}</TableCell>
            <TableCell>
              <Badge variant={app.status === 'pending' ? 'default' : app.status === 'approved' ? 'secondary' : 'destructive'}>
                {app.status}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => handleViewId(app.id_document_url)}>View ID</Button>
                {app.status === 'pending' && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => reviewMutation.mutate({ applicationId: app.id, status: 'approved' })}
                      disabled={reviewMutation.isPending}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => reviewMutation.mutate({ applicationId: app.id, status: 'rejected' })}
                      disabled={reviewMutation.isPending}
                    >
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
