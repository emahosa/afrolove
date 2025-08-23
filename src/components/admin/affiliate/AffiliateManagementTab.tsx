import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

// New types based on the new schema
interface AffiliateApplication {
  id: string;
  user_id: string;
  social_profile_url: string | null;
  note: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  rejection_reason: string | null;
  // Joined from auth.users
  user_email: string;
}

interface ApprovedAffiliate {
  id: string;
  user_id: string;
  code: string;
  status: 'approved' | 'suspended';
  approved_at: string;
  wallet_trc20_usdt: string | null;
  // Joined from auth.users
  user_email: string;
}

type ActiveTab = 'pending' | 'approved' | 'rejected';

const AffiliateManagementTab: React.FC = () => {
  const [applications, setApplications] = useState<AffiliateApplication[]>([]);
  const [affiliates, setAffiliates] = useState<ApprovedAffiliate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('pending');

  const fetchApplications = useCallback(async (status: 'pending' | 'rejected') => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('affiliate_applications')
        .select(`
          id,
          user_id,
          social_profile_url,
          note,
          status,
          created_at,
          rejection_reason,
          user:users(email)
        `)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data.map((app: any) => ({
        ...app,
        user_email: app.user?.email || 'N/A',
      }));
      setApplications(formattedData);

    } catch (err: any) {
      setError(err.message);
      toast.error(`Failed to fetch ${status} applications: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAffiliates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('affiliates')
        .select(`
          id,
          user_id,
          code,
          status,
          approved_at,
          wallet_trc20_usdt,
          user:users(email)
        `)
        .order('approved_at', { ascending: false });

      if (error) throw error;

      const formattedData = data.map((aff: any) => ({
        ...aff,
        user_email: aff.user?.email || 'N/A',
      }));
      setAffiliates(formattedData);

    } catch (err: any) {
      setError(err.message);
      toast.error(`Failed to fetch affiliates: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchApplications('pending');
    } else if (activeTab === 'rejected') {
      fetchApplications('rejected');
    } else if (activeTab === 'approved') {
      fetchAffiliates();
    }
  }, [activeTab, fetchApplications, fetchAffiliates]);

  const handleApprove = async (applicationId: string) => {
    try {
      const { error } = await supabase.rpc('approve_affiliate_application', {
        p_application_id: applicationId,
      });

      if (error) throw error;

      toast.success('Application approved successfully!');
      fetchApplications('pending'); // Refresh the pending list
    } catch (err: any) {
      toast.error(`Failed to approve application: ${err.message}`);
      console.error(err);
    }
  };

  const handleReject = async (applicationId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) {
      toast.info('Rejection requires a reason.');
      return;
    }

    try {
      const { error } = await supabase.rpc('reject_affiliate_application', {
        p_application_id: applicationId,
        p_rejection_reason: reason,
      });

      if (error) throw error;

      toast.success('Application rejected successfully!');
      fetchApplications('pending'); // Refresh the pending list
    } catch (err: any) {
      toast.error(`Failed to reject application: ${err.message}`);
      console.error(err);
    }
  };

  const renderContent = () => {
    if (loading) {
      return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    if (error) {
      return <div className="text-red-600 p-4 bg-red-100 rounded-md flex items-center"><AlertCircle className="h-5 w-5 mr-2" /> {error}</div>;
    }

    if (activeTab === 'pending' || activeTab === 'rejected') {
      if (applications.length === 0) return <p className="text-center p-4">No {activeTab} applications found.</p>;
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Applicant Email</TableHead>
              <TableHead>Social Profile</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Submitted</TableHead>
              {activeTab === 'rejected' && <TableHead>Rejection Reason</TableHead>}
              {activeTab === 'pending' && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map(app => (
              <TableRow key={app.id}>
                <TableCell>{app.user_email}</TableCell>
                <TableCell><a href={app.social_profile_url || ''} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{app.social_profile_url}</a></TableCell>
                <TableCell className="max-w-xs truncate" title={app.note || ''}>{app.note || 'N/A'}</TableCell>
                <TableCell>{format(new Date(app.created_at), 'MMM d, yyyy')}</TableCell>
                {activeTab === 'rejected' && <TableCell>{app.rejection_reason}</TableCell>}
                {activeTab === 'pending' && (
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button size="sm" onClick={() => handleApprove(app.id)}><CheckCircle className="h-4 w-4 mr-1" /> Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(app.id)}><XCircle className="h-4 w-4 mr-1" /> Reject</Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

    if (activeTab === 'approved') {
      if (affiliates.length === 0) return <p className="text-center p-4">No approved affiliates found.</p>;
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Affiliate Email</TableHead>
              <TableHead>Affiliate Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Wallet</TableHead>
              <TableHead>Approved On</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {affiliates.map(aff => (
              <TableRow key={aff.id}>
                <TableCell>{aff.user_email}</TableCell>
                <TableCell><code>{aff.code}</code></TableCell>
                <TableCell><Badge>{aff.status}</Badge></TableCell>
                <TableCell>{aff.wallet_trc20_usdt || 'N/A'}</TableCell>
                <TableCell>{format(new Date(aff.approved_at), 'MMM d, yyyy')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Affiliate Management</CardTitle>
        <CardDescription>Review applications and manage approved affiliates.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActiveTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="pending">Pending Applications</TabsTrigger>
            <TabsTrigger value="approved">Approved Affiliates</TabsTrigger>
            <TabsTrigger value="rejected">Rejected Applications</TabsTrigger>
          </TabsList>
          <TabsContent value="pending">{renderContent()}</TabsContent>
          <TabsContent value="approved">{renderContent()}</TabsContent>
          <TabsContent value="rejected">{renderContent()}</TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AffiliateManagementTab;
