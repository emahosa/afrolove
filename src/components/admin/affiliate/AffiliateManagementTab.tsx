
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AffiliateApplication {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  social_media_url: string;
  reason_to_join: string;
  usdt_wallet_address: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle } from 'lucide-react';

const AffiliateManagementTab: React.FC = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<AffiliateApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.functions.invoke('admin-list-affiliate-applications');

      console.log('Admin List Affiliate Applications Response:', { data, error });
      if (error) {
        throw new Error(error.message || 'Failed to fetch affiliate applications');
      }

      setApplications((data as AffiliateApplication[]) || []);
    } catch (err: any) {
      console.error('Error in fetchApplications:', err);
      setError(err.message || 'Failed to load affiliate applications');
      toast.error(err.message || 'Failed to load affiliate applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleApproveApplication = async (applicationId: string) => {
    setProcessingId(applicationId);
    try {
      const { error } = await supabase.functions.invoke('approve-affiliate-application', {
        body: { application_id: applicationId }
      });

      if (error) {
        toast.error(error.message || 'Failed to approve application');
        return;
      }

      toast.success('Application approved successfully');
      fetchApplications(); // Refresh the list
    } catch (err: any) {
      console.error('Error approving application:', err);
      toast.error('Failed to approve application');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectApplication = async (applicationId: string) => {
    setProcessingId(applicationId);
    try {
      const { error } = await supabase.functions.invoke('reject-affiliate-application', {
        body: { application_id: applicationId }
      });

      if (error) {
        toast.error(error.message || 'Failed to reject application');
        return;
      }

      toast.success('Application rejected');
      fetchApplications(); // Refresh the list
    } catch (err: any) {
      console.error('Error rejecting application:', err);
      toast.error('Failed to reject application');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const filterApplications = (status: string) => {
    return applications.filter(app => app.status === status);
  };

  const ApplicationCard = ({ application }: { application: AffiliateApplication }) => (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{application.full_name}</CardTitle>
            <p className="text-sm text-muted-foreground">{application.email}</p>
          </div>
          <Badge variant={getStatusBadgeVariant(application.status)}>
            {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          <p><strong>Phone:</strong> {application.phone}</p>
          <p><strong>Social Media:</strong> {application.social_media_url}</p>
          <p><strong>USDT Wallet:</strong> {application.usdt_wallet_address}</p>
          <p><strong>Reason to Join:</strong> {application.reason_to_join}</p>
          <p><strong>Applied:</strong> {new Date(application.created_at).toLocaleDateString()}</p>
        </div>
        
        {application.status === 'pending' && (
          <div className="flex gap-2">
            <Button
              onClick={() => handleApproveApplication(application.id)}
              disabled={processingId === application.id}
              className="flex-1"
            >
              {processingId === application.id ? 'Approving...' : 'Approve'}
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleRejectApplication(application.id)}
              disabled={processingId === application.id}
              className="flex-1"
            >
              {processingId === application.id ? 'Rejecting...' : 'Reject'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading applications...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const pendingApplications = filterApplications('pending');
  const approvedApplications = filterApplications('approved');
  const rejectedApplications = filterApplications('rejected');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Affiliate Management</h2>
        <p className="text-muted-foreground">Manage affiliate applications and approvals</p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Pending ({pendingApplications.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedApplications.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedApplications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <div className="space-y-4">
            {pendingApplications.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No pending applications</p>
                </CardContent>
              </Card>
            ) : (
              pendingApplications.map((application) => (
                <ApplicationCard key={application.id} application={application} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          <div className="space-y-4">
            {approvedApplications.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No approved applications</p>
                </CardContent>
              </Card>
            ) : (
              approvedApplications.map((application) => (
                <ApplicationCard key={application.id} application={application} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          <div className="space-y-4">
            {rejectedApplications.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No rejected applications</p>
                </CardContent>
              </Card>
            ) : (
              rejectedApplications.map((application) => (
                <ApplicationCard key={application.id} application={application} />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AffiliateManagementTab;
