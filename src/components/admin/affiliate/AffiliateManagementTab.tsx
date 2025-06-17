import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input"; // For notes on approval
import { Textarea } from "@/components/ui/textarea"; // For rejection reason input dialog (conceptual)
import { toast } from "sonner";
import { Loader2, AlertCircle, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface AffiliateApplication {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  social_media_url: string;
  reason_to_join: string;
  status: 'pending' | 'approved' | 'rejected';
  unique_referral_code?: string;
  created_at: string;
  updated_at: string;
}

interface PayoutRequestProfile {
  full_name: string | null;
  email: string | null;
}
interface PayoutRequest {
  id: string;
  affiliate_user_id: string;
  requested_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  requested_at: string;
  processed_at?: string | null;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
  profile?: PayoutRequestProfile | null; // From joined data
}

type ActiveSubTabType = 'pendingApps' | 'approvedApps' | 'rejectedApps' | 'payoutRequests';

const AffiliateManagementTab: React.FC = () => {
  const [applications, setApplications] = useState<AffiliateApplication[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [appsCurrentPage, setAppsCurrentPage] = useState(1);
  const [appsTotalPages, setAppsTotalPages] = useState(1);
  const [appsTotalItems, setAppsTotalItems] = useState(0);

  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [payoutsError, setPayoutsError] = useState<string | null>(null);
  const [payoutsCurrentPage, setPayoutsCurrentPage] = useState(1);
  const [payoutsTotalPages, setPayoutsTotalPages] = useState(1);
  const [payoutsTotalItems, setPayoutsTotalItems] = useState(0);

  const [activePayoutStatusFilter, setActivePayoutStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'paid' | null>('pending');


  const [activeSubTab, setActiveSubTab] = useState<ActiveSubTabType>('pendingApps');
  const pageSize = 10;

  const fetchApplications = useCallback(async (status: 'pending' | 'approved' | 'rejected', page: number) => {
    setAppsLoading(true);
    setAppsError(null);
    try {
      const { data, error: funcError } = await supabase.functions.invoke('list-affiliate-applications', {
        query: { status, page, pageSize },
      });

      if (funcError) throw new Error(funcError.message || 'Failed to fetch applications');

      const responseData = data?.data || data;
      const paginationData = data?.pagination;

      if (!Array.isArray(responseData)) {
        console.error("Unexpected data format from list-affiliate-applications:", responseData);
        throw new Error("Unexpected data format received from server.");
      }
      setApplications(responseData);
      if (paginationData) {
        setAppsCurrentPage(paginationData.currentPage);
        setAppsTotalPages(paginationData.totalPages);
        setAppsTotalItems(paginationData.totalItems);
      } else {
        setAppsTotalPages(Math.ceil(responseData.length / pageSize));
        setAppsTotalItems(responseData.length);
      }
    } catch (err: any) {
      console.error(`Error fetching ${status} applications:`, err);
      setAppsError(err.message || 'An unexpected error occurred.');
      setApplications([]);
    } finally {
      setAppsLoading(false);
    }
  }, [pageSize]);

  const fetchPayoutRequests = useCallback(async (status: string | null, page: number) => {
    setPayoutsLoading(true);
    setPayoutsError(null);
    try {
      const queryParams: { page: number, pageSize: number, status?: string } = { page, pageSize };
      if (status) {
        queryParams.status = status;
      }
      const { data, error: funcError } = await supabase.functions.invoke('list-affiliate-payout-requests', {
        query: queryParams,
      });

      if (funcError) throw new Error(funcError.message || 'Failed to fetch payout requests');

      const responseData = data?.data || data;
      const paginationData = data?.pagination;

      if (!Array.isArray(responseData)) {
        console.error("Unexpected data format from list-affiliate-payout-requests:", responseData);
        throw new Error("Unexpected data format received from server.");
      }

      setPayoutRequests(responseData);
      if (paginationData) {
        setPayoutsCurrentPage(paginationData.currentPage);
        setPayoutsTotalPages(paginationData.totalPages);
        setPayoutsTotalItems(paginationData.totalItems);
      } else {
        setPayoutsTotalPages(Math.ceil(responseData.length / pageSize));
        setPayoutsTotalItems(responseData.length);
      }
    } catch (err: any) {
      console.error("Error fetching payout requests:", err);
      setPayoutsError(err.message || 'An unexpected error occurred.');
      setPayoutRequests([]);
    } finally {
      setPayoutsLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    if (activeSubTab === 'pendingApps') fetchApplications('pending', appsCurrentPage);
    else if (activeSubTab === 'approvedApps') fetchApplications('approved', appsCurrentPage);
    else if (activeSubTab === 'rejectedApps') fetchApplications('rejected', appsCurrentPage);
    else if (activeSubTab === 'payoutRequests') fetchPayoutRequests(activePayoutStatusFilter, payoutsCurrentPage);
  }, [activeSubTab, fetchApplications, fetchPayoutRequests, appsCurrentPage, payoutsCurrentPage, activePayoutStatusFilter]);


  const handleApproveApplication = async (applicationId: string) => {
    // setLoading/setAppsLoading appropriately if needed for individual row, or overall
    try {
      const { error } = await supabase.functions.invoke('approve-affiliate-application', {
        body: { application_id: applicationId },
      });
      if (error) throw error;
      toast.success("Application approved successfully!");
      fetchApplications('pending', appsCurrentPage); // Refresh current list
    } catch (err: any) {
      console.error("Error approving application:", err);
      toast.error(err.message || "Failed to approve application.");
    }
  };

  const handleRejectApplication = async (applicationId: string) => {
    const reason = prompt("Please enter the reason for rejection (required):");
    if (!reason || reason.trim() === "") {
      toast.info("Rejection reason is required.");
      return;
    }
    try {
      const { error } = await supabase.functions.invoke('reject-affiliate-application', {
        body: { application_id: applicationId, admin_notes: reason },
      });
      if (error) throw error;
      toast.success("Application rejected successfully!");
      fetchApplications('pending', appsCurrentPage); // Refresh current list
    } catch (err: any) {
      console.error("Error rejecting application:", err);
      toast.error(err.message || "Failed to reject application.");
    }
  };

  const handleApprovePayout = async (payoutRequestId: string) => {
    const notes = prompt("Optional: Add admin notes for this approval.");
    try {
      const { error } = await supabase.functions.invoke('approve-affiliate-payout-request', {
        body: { payout_request_id: payoutRequestId, admin_notes: notes || undefined },
      });
      if (error) throw error;
      toast.success("Payout request approved successfully!");
      fetchPayoutRequests(activePayoutStatusFilter, payoutsCurrentPage); // Refresh list
    } catch (err: any) {
      console.error("Error approving payout:", err);
      toast.error(err.message || "Failed to approve payout request.");
    }
  };

  const handleRejectPayout = async (payoutRequestId: string) => {
    const reason = prompt("Reason for rejecting payout request (required):");
    if (!reason || reason.trim() === "") {
      toast.info("Rejection reason is required for payouts.");
      return;
    }
    try {
      const { error } = await supabase.functions.invoke('reject-affiliate-payout-request', {
        body: { payout_request_id: payoutRequestId, admin_notes: reason },
      });
      if (error) throw error;
      toast.success("Payout request rejected successfully!");
      fetchPayoutRequests(activePayoutStatusFilter, payoutsCurrentPage); // Refresh list
    } catch (err: any) {
      console.error("Error rejecting payout:", err);
      toast.error(err.message || "Failed to reject payout request.");
    }
  };

  const renderAppsPagination = () => {
    if (appsTotalPages <= 1) return null;
    return (
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAppsCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={appsCurrentPage === 1 || appsLoading}
        >
          Previous
        </Button>
        <span className="text-sm">
          Page {appsCurrentPage} of {appsTotalPages} ({appsTotalItems} items)
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAppsCurrentPage(prev => Math.min(appsTotalPages, prev + 1))}
          disabled={appsCurrentPage === appsTotalPages || appsLoading}
        >
          Next
        </Button>
      </div>
    );
  };

  const renderPayoutsPagination = () => {
    if (payoutsTotalPages <= 1) return null;
    return (
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPayoutsCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={payoutsCurrentPage === 1 || payoutsLoading}
        >
          Previous
        </Button>
         <span className="text-sm">
          Page {payoutsCurrentPage} of {payoutsTotalPages} ({payoutsTotalItems} items)
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPayoutsCurrentPage(prev => Math.min(payoutsTotalPages, prev + 1))}
          disabled={payoutsCurrentPage === payoutsTotalPages || payoutsLoading}
        >
          Next
        </Button>
      </div>
    );
  };

  const renderApplicationsTable = (statusToRender: 'pending' | 'approved' | 'rejected') => {
    if (appsLoading && !applications.length) {
      return <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading applications...</span></div>;
    }
    if (appsError) {
      return <div className="text-red-600 p-4 bg-red-100 border border-red-300 rounded-md flex items-center"><AlertCircle className="h-5 w-5 mr-2" />Error: {appsError}</div>;
    }
    if (applications.length === 0 && !appsLoading) {
      return <p className="p-4 text-center text-muted-foreground">No {statusToRender} applications found.</p>;
    }

    return (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Submitted At</TableHead>
              <TableHead>Status</TableHead>
              {statusToRender === 'approved' && <TableHead>Referral Code</TableHead>}
              {statusToRender === 'pending' && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((app) => (
              <TableRow key={app.id}>
                <TableCell>{app.full_name}</TableCell>
                <TableCell>{app.email}</TableCell>
                <TableCell>{format(parseISO(app.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                <TableCell><Badge variant={app.status === 'approved' ? 'success' : app.status === 'rejected' ? 'destructive' : 'outline'}>{app.status}</Badge></TableCell>
                {statusToRender === 'approved' && <TableCell>{app.unique_referral_code || 'N/A'}</TableCell>}
                {statusToRender === 'pending' && (
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="success" onClick={() => handleApproveApplication(app.id)} disabled={appsLoading}><CheckCircle className="h-4 w-4 mr-1"/>Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleRejectApplication(app.id)} disabled={appsLoading}><XCircle className="h-4 w-4 mr-1"/>Reject</Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {renderAppsPagination()}
      </>
    );
  };

  const renderPayoutRequestsTable = () => {
    if (payoutsLoading && !payoutRequests.length) {
      return <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading payout requests...</span></div>;
    }
    if (payoutsError) {
      return <div className="text-red-600 p-4 bg-red-100 border border-red-300 rounded-md flex items-center"><AlertCircle className="h-5 w-5 mr-2" />Error: {payoutsError}</div>;
    }
    if (payoutRequests.length === 0 && !payoutsLoading) {
      return <p className="p-4 text-center text-muted-foreground">No payout requests found for this status.</p>;
    }
    return (
      <>
        <div className="flex space-x-2 mb-4">
            {(['pending', 'approved', 'rejected', 'paid'] as const).map(status => (
                 <Button
                    key={status}
                    variant={activePayoutStatusFilter === status ? "default" : "outline"}
                    onClick={() => { setActivePayoutStatusFilter(status); setPayoutsCurrentPage(1);}}
                 >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                 </Button>
            ))}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Affiliate</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested At</TableHead>
              <TableHead>Processed At</TableHead>
              <TableHead>Admin Notes</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payoutRequests.map((req) => (
              <TableRow key={req.id}>
                <TableCell>{req.profile?.full_name || req.profile?.email || req.affiliate_user_id}</TableCell>
                <TableCell><DollarSign className="h-4 w-4 inline mr-1"/>{Number(req.requested_amount).toFixed(2)}</TableCell>
                <TableCell><Badge variant={req.status === 'approved' || req.status === 'paid' ? 'success' : req.status === 'rejected' ? 'destructive' : 'outline'}>{req.status}</Badge></TableCell>
                <TableCell>{format(parseISO(req.requested_at), 'MMM d, yyyy HH:mm')}</TableCell>
                <TableCell>{req.processed_at ? format(parseISO(req.processed_at), 'MMM d, yyyy HH:mm') : 'N/A'}</TableCell>
                <TableCell className="max-w-xs truncate" title={req.admin_notes || undefined}>{req.admin_notes || 'N/A'}</TableCell>
                <TableCell>
                  {req.status === 'pending' && (
                    <div className="flex space-x-2">
                      <Button size="sm" variant="success" onClick={() => handleApprovePayout(req.id)} disabled={payoutsLoading}><CheckCircle className="h-4 w-4 mr-1"/>Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleRejectPayout(req.id)} disabled={payoutsLoading}><XCircle className="h-4 w-4 mr-1"/>Reject</Button>
                    </div>
                  )}
                   {req.status === 'approved' && ( // Example: Button to mark as paid
                     <Button size="sm" variant="default" disabled={payoutsLoading} onClick={() => toast.info("Mark as Paid functionality to be implemented.")}>Mark as Paid</Button>
                   )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {renderPayoutsPagination()}
      </>
    );
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Affiliate Program Management</CardTitle>
        <CardDescription>Manage affiliate applications, view approved affiliates, and handle payout requests.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeSubTab} onValueChange={(value) => {
          setActiveSubTab(value as ActiveSubTabType);
          // Reset pages when changing main tabs
          setAppsCurrentPage(1);
          setPayoutsCurrentPage(1);
          if (value === 'payoutRequests' && !activePayoutStatusFilter) setActivePayoutStatusFilter('pending'); // Default filter for payouts
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="pendingApps">Pending Applications</TabsTrigger>
            <TabsTrigger value="approvedApps">Approved Affiliates</TabsTrigger>
            <TabsTrigger value="rejectedApps">Rejected Applications</TabsTrigger>
            <TabsTrigger value="payoutRequests">Payout Requests</TabsTrigger>
          </TabsList>
          <TabsContent value="pendingApps">
            {renderApplicationsTable('pending')}
          </TabsContent>
          <TabsContent value="approvedApps">
             {renderApplicationsTable('approved')}
          </TabsContent>
          <TabsContent value="rejectedApps">
             {renderApplicationsTable('rejected')}
          </TabsContent>
          <TabsContent value="payoutRequests">
            {renderPayoutRequestsTable()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AffiliateManagementTab;
