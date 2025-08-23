import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, AlertCircle, CheckCircle, XCircle, DollarSign, Settings, BarChart2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

type ActiveSubTabType = 'pendingApps' | 'approvedApps' | 'rejectedApps' | 'payoutRequests' | 'settings';

// Affiliate Settings Component
interface AffiliateSettingsData {
  affiliate_program_enabled: boolean;
  is_free_tier_active: boolean;
  affiliate_subscription_commission_percent: number;
  affiliate_free_referral_compensation: number;
}

const AffiliateSettings: React.FC = () => {
  const [settings, setSettings] = useState<Partial<AffiliateSettingsData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', [
          'affiliate_program_enabled',
          'is_free_tier_active',
          'affiliate_subscription_commission_percent',
          'affiliate_free_referral_compensation',
        ]);

      if (error) {
        toast.error('Failed to fetch affiliate settings.');
        console.error(error);
      } else {
        const settingsData = data.reduce((acc, { key, value }) => {
          if (key === 'affiliate_program_enabled' || key === 'is_free_tier_active') {
            acc[key] = value === 'true';
          } else {
            acc[key] = Number(value);
          }
          return acc;
        }, {} as AffiliateSettingsData);
        setSettings(settingsData);
      }
    } catch (error) {
      toast.error('An error occurred while fetching settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    console.log('Saving settings:', settings);
    const updates = Object.entries(settings).map(([key, value]) => ({
      key,
      value: String(value),
    }));
    console.log('Sending updates to backend:', updates);

    try {
      const { data, error } = await supabase.functions.invoke('update-affiliate-settings', {
        body: { settings: updates },
      });

      console.log('Backend response:', { data, error });

      if (error) {
        toast.error('Failed to save settings.');
      } else {
        toast.success('Settings saved successfully.');
        fetchSettings(); // Refresh settings
      }
    } catch (error) {
      toast.error('An error occurred while saving settings.');
      console.error('Save settings error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (key: keyof AffiliateSettingsData, value: any) => {
    setSettings(prev => ({...prev, [key]: value}));
  };

  if (loading) {
    return <div className="flex items-center space-x-2"><Loader2 className="animate-spin h-5 w-5" /><span>Loading settings...</span></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Affiliate Program Settings</CardTitle>
        <CardDescription>Configure the affiliate program rules and compensation.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
          <Label htmlFor="program-enabled" className="flex flex-col space-y-1">
            <span>Affiliate Program Enabled</span>
            <span className="font-normal leading-snug text-muted-foreground">
              Master switch to enable or disable the entire affiliate program.
            </span>
          </Label>
          <Switch
            id="program-enabled"
            checked={settings.affiliate_program_enabled}
            onCheckedChange={(value) => handleSettingChange('affiliate_program_enabled', value)}
          />
        </div>
        <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
          <Label htmlFor="free-tier-enabled" className="flex flex-col space-y-1">
            <span>Free Referral Program Enabled</span>
            <span className="font-normal leading-snug text-muted-foreground">
              Enable or disable earnings for free user referrals who become active.
            </span>
          </Label>
          <Switch
            id="free-tier-enabled"
            checked={settings.is_free_tier_active}
            onCheckedChange={(value) => handleSettingChange('is_free_tier_active', value)}
          />
        </div>
        <div className="space-y-2 p-4 border rounded-lg">
          <Label htmlFor="commission-percent">Subscription Commission (%)</Label>
          <Input
            id="commission-percent"
            type="number"
            value={settings.affiliate_subscription_commission_percent}
            onChange={(e) => handleSettingChange('affiliate_subscription_commission_percent', parseFloat(e.target.value) || 0)}
            placeholder="e.g., 10"
          />
           <p className="text-sm text-muted-foreground">The percentage of a subscription payment that goes to the affiliate.</p>
        </div>
        <div className="space-y-2 p-4 border rounded-lg">
          <Label htmlFor="free-referral-comp">Free Referral Compensation ($)</Label>
          <Input
            id="free-referral-comp"
            type="number"
            value={settings.affiliate_free_referral_compensation}
            onChange={(e) => handleSettingChange('affiliate_free_referral_compensation', parseFloat(e.target.value) || 0)}
            placeholder="e.g., 0.10"
          />
           <p className="text-sm text-muted-foreground">The flat amount an affiliate earns for a referred free user who becomes active.</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  );
};

// Affiliate Stats Component
const AffiliateStats: React.FC = () => {
  const [stats, setStats] = useState({
    totalReferred: 0,
    invalidReferrals: 0,
    nonActiveReferrals: 0,
    subscribedReferrals: 0,
    activeFreeReferrals: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('get-affiliate-stats');
        if (error) {
          toast.error('Failed to fetch affiliate stats.');
          console.error(error);
        } else {
          setStats(data.stats);
        }
      } catch (error) {
        toast.error('An error occurred while fetching stats.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Affiliate Statistics</CardTitle>
          <CardDescription>An overview of the affiliate program performance.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2"><Loader2 className="animate-spin h-5 w-5" /><span>Loading stats...</span></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Affiliate Statistics</CardTitle>
        <CardDescription>An overview of the affiliate program performance.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <div className="p-4 border rounded-lg text-center">
            <p className="text-2xl font-bold">{stats.totalReferred}</p>
            <p className="text-sm text-muted-foreground">Total Referred</p>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <p className="text-2xl font-bold">{stats.invalidReferrals}</p>
            <p className="text-sm text-muted-foreground">Invalid Referrals</p>
          </div>
           <div className="p-4 border rounded-lg text-center">
            <p className="text-2xl font-bold">{stats.nonActiveReferrals}</p>
            <p className="text-sm text-muted-foreground">Non-Active</p>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <p className="text-2xl font-bold">{stats.subscribedReferrals}</p>
            <p className="text-sm text-muted-foreground">Subscribed</p>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <p className="text-2xl font-bold">{stats.activeFreeReferrals}</p>
            <p className="text-sm text-muted-foreground">Active Free</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


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
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const pageSize = 10;

  const fetchApplications = useCallback(async (status: 'pending' | 'approved' | 'rejected', page: number) => {
    setAppsLoading(true);
    setAppsError(null);
    try {
      const { data, error: funcError } = await supabase.functions.invoke('list-affiliate-applications', {
        body: { status, page, pageSize },
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
      const requestBody: { page: number, pageSize: number, status?: string } = { page, pageSize };
      if (status) {
        requestBody.status = status;
      }
      const { data, error: funcError } = await supabase.functions.invoke('list-affiliate-payout-requests', {
        body: requestBody,
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

    const toggleRow = (id: string) => {
      setExpandedRows(prev => ({...prev, [id]: !prev[id]}));
    };

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
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((app) => (
              <Collapsible asChild key={app.id} open={expandedRows[app.id] || false} onOpenChange={() => toggleRow(app.id)}>
                <>
                  <TableRow>
                    <TableCell>{app.full_name}</TableCell>
                    <TableCell>{app.email}</TableCell>
                    <TableCell>{format(parseISO(app.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                    <TableCell><Badge variant={app.status === 'approved' ? 'default' : app.status === 'rejected' ? 'destructive' : 'outline'}>{app.status}</Badge></TableCell>
                    {statusToRender === 'approved' && <TableCell>{app.unique_referral_code || 'N/A'}</TableCell>}
                    {statusToRender === 'pending' && (
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="default" onClick={() => handleApproveApplication(app.id)} disabled={appsLoading}><CheckCircle className="h-4 w-4 mr-1"/>Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleRejectApplication(app.id)} disabled={appsLoading}><XCircle className="h-4 w-4 mr-1"/>Reject</Button>
                        </div>
                      </TableCell>
                    )}
                     <TableCell>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-20">
                          {expandedRows[app.id] ? 'Hide' : 'View'} Details
                        </Button>
                      </CollapsibleTrigger>
                    </TableCell>
                  </TableRow>
                  <CollapsibleContent asChild>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableCell colSpan={statusToRender === 'pending' ? 7 : (statusToRender === 'approved' ? 6 : 5)}>
                        <div className="p-4">
                          <h4 className="font-semibold mb-2 text-foreground">Full Application Details:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                            <div><strong>Phone:</strong> <span className="text-muted-foreground">{app.phone}</span></div>
                            <div><strong>Social Media:</strong> <a href={app.social_media_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{app.social_media_url}</a></div>
                          </div>
                          <div className="mt-3">
                            <p><strong>Reason to Join:</strong></p>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{app.reason_to_join}</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  </CollapsibleContent>
                </>
              </Collapsible>
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
                <TableCell><Badge variant={req.status === 'approved' || req.status === 'paid' ? 'default' : req.status === 'rejected' ? 'destructive' : 'outline'}>{req.status}</Badge></TableCell>
                <TableCell>{format(parseISO(req.requested_at), 'MMM d, yyyy HH:mm')}</TableCell>
                <TableCell>{req.processed_at ? format(parseISO(req.processed_at), 'MMM d, yyyy HH:mm') : 'N/A'}</TableCell>
                <TableCell className="max-w-xs truncate" title={req.admin_notes || undefined}>{req.admin_notes || 'N/A'}</TableCell>
                <TableCell>
                  {req.status === 'pending' && (
                    <div className="flex space-x-2">
                      <Button size="sm" variant="default" onClick={() => handleApprovePayout(req.id)} disabled={payoutsLoading}><CheckCircle className="h-4 w-4 mr-1"/>Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleRejectPayout(req.id)} disabled={payoutsLoading}><XCircle className="h-4 w-4 mr-1"/>Reject</Button>
                    </div>
                  )}
                   {req.status === 'approved' && (
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
          setAppsCurrentPage(1);
          setPayoutsCurrentPage(1);
          if (value === 'payoutRequests' && !activePayoutStatusFilter) setActivePayoutStatusFilter('pending');
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="pendingApps">Pending Applications</TabsTrigger>
            <TabsTrigger value="approvedApps">Approved Affiliates</TabsTrigger>
            <TabsTrigger value="rejectedApps">Rejected Applications</TabsTrigger>
            <TabsTrigger value="payoutRequests">Payout Requests</TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings & Stats
            </TabsTrigger>
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
          <TabsContent value="settings">
            <div className="space-y-6">
              <AffiliateStats />
              <AffiliateSettings />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AffiliateManagementTab;
