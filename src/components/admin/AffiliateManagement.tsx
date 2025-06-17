
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, XCircle, Eye, DollarSign, Users, TrendingUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Application {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  social_media_url: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profiles: {
    full_name: string;
    username: string;
  };
}

interface Affiliate {
  id: string;
  user_id: string;
  affiliate_code: string;
  total_earnings: number;
  is_active: boolean;
  created_at: string;
  profiles: {
    full_name: string;
    username: string;
  };
  referrals: { count: number }[];
  affiliate_commissions: { sum: { commission_amount: number } }[];
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  bank_details: any;
  requested_at: string;
  affiliates: {
    affiliate_code: string;
    profiles: {
      full_name: string;
    };
  };
}

const AffiliateManagement = () => {
  const { isSuperAdmin } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  useEffect(() => {
    if (isSuperAdmin()) {
      loadData();
    }
  }, [isSuperAdmin]);

  const loadData = async () => {
    try {
      // Load applications
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('affiliate_applications')
        .select(`
          *,
          profiles!affiliate_applications_user_id_fkey (full_name, username)
        `)
        .order('created_at', { ascending: false });

      if (applicationsError) throw applicationsError;
      setApplications(applicationsData || []);

      // Load affiliates with stats
      const { data: affiliatesData, error: affiliatesError } = await supabase
        .from('affiliates')
        .select(`
          *,
          profiles!affiliates_user_id_fkey (full_name, username),
          referrals (count),
          affiliate_commissions (commission_amount.sum())
        `)
        .order('created_at', { ascending: false });

      if (affiliatesError) throw affiliatesError;
      setAffiliates(affiliatesData || []);

      // Load withdrawal requests
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from('affiliate_withdrawals')
        .select(`
          *,
          affiliates!affiliate_withdrawals_affiliate_id_fkey (
            affiliate_code,
            profiles!affiliates_user_id_fkey (full_name)
          )
        `)
        .order('requested_at', { ascending: false });

      if (withdrawalsError) throw withdrawalsError;
      setWithdrawals(withdrawalsData || []);

    } catch (error: any) {
      console.error('Error loading affiliate data:', error);
      toast.error('Failed to load affiliate data');
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationReview = async (applicationId: string, status: 'approved' | 'rejected') => {
    try {
      const { error: updateError } = await supabase
        .from('affiliate_applications')
        .update({
          status,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      if (status === 'approved') {
        // Create affiliate record using edge function
        const application = applications.find(app => app.id === applicationId);
        if (application) {
          const { data, error: affiliateError } = await supabase.functions.invoke('create-affiliate', {
            body: {
              userId: application.user_id,
              fullName: application.full_name,
              email: application.email
            }
          });

          if (affiliateError) throw affiliateError;
        }
      }

      toast.success(`Application ${status} successfully`);
      loadData();
    } catch (error: any) {
      console.error('Error reviewing application:', error);
      toast.error(`Failed to ${status} application`);
    }
  };

  const handleWithdrawalReview = async (withdrawalId: string, status: 'approved' | 'rejected' | 'paid') => {
    try {
      const { error } = await supabase
        .from('affiliate_withdrawals')
        .update({
          status,
          processed_at: new Date().toISOString()
        })
        .eq('id', withdrawalId);

      if (error) throw error;

      toast.success(`Withdrawal ${status} successfully`);
      loadData();
    } catch (error: any) {
      console.error('Error processing withdrawal:', error);
      toast.error(`Failed to ${status} withdrawal`);
    }
  };

  if (!isSuperAdmin()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access affiliate management.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const pendingApplications = applications.filter(app => app.status === 'pending').length;
  const totalAffiliates = affiliates.length;
  const totalEarnings = affiliates.reduce((sum, aff) => sum + aff.total_earnings, 0);
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Affiliate Management</h1>
        <p className="text-muted-foreground">Manage affiliate applications, approvals, and withdrawals</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingApplications}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Affiliates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAffiliates}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalEarnings.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingWithdrawals}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="applications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="affiliates">Affiliates</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
        </TabsList>

        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle>Affiliate Applications</CardTitle>
              <CardDescription>Review and approve affiliate applications</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell className="font-medium">
                        {application.full_name}
                      </TableCell>
                      <TableCell>{application.email}</TableCell>
                      <TableCell>
                        <Badge variant={
                          application.status === 'pending' ? 'secondary' :
                          application.status === 'approved' ? 'default' : 'destructive'
                        }>
                          {application.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(application.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedApplication(application)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Application Details</DialogTitle>
                                <DialogDescription>
                                  Review the affiliate application details
                                </DialogDescription>
                              </DialogHeader>
                              {selectedApplication && (
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="font-medium">Full Name</h4>
                                    <p className="text-sm text-muted-foreground">{selectedApplication.full_name}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium">Email</h4>
                                    <p className="text-sm text-muted-foreground">{selectedApplication.email}</p>
                                  </div>
                                  {selectedApplication.phone && (
                                    <div>
                                      <h4 className="font-medium">Phone</h4>
                                      <p className="text-sm text-muted-foreground">{selectedApplication.phone}</p>
                                    </div>
                                  )}
                                  {selectedApplication.social_media_url && (
                                    <div>
                                      <h4 className="font-medium">Social Media</h4>
                                      <p className="text-sm text-muted-foreground">{selectedApplication.social_media_url}</p>
                                    </div>
                                  )}
                                  <div>
                                    <h4 className="font-medium">Reason for Joining</h4>
                                    <p className="text-sm text-muted-foreground">{selectedApplication.reason}</p>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          {application.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApplicationReview(application.id, 'approved')}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleApplicationReview(application.id, 'rejected')}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="affiliates">
          <Card>
            <CardHeader>
              <CardTitle>Active Affiliates</CardTitle>
              <CardDescription>Manage your affiliate partners</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Referrals</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affiliates.map((affiliate) => (
                    <TableRow key={affiliate.id}>
                      <TableCell className="font-medium">
                        {affiliate.profiles.full_name || affiliate.profiles.username}
                      </TableCell>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded">{affiliate.affiliate_code}</code>
                      </TableCell>
                      <TableCell>
                        {affiliate.referrals[0]?.count || 0}
                      </TableCell>
                      <TableCell>
                        ${affiliate.total_earnings.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={affiliate.is_active ? 'default' : 'secondary'}>
                          {affiliate.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(affiliate.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals">
          <Card>
            <CardHeader>
              <CardTitle>Withdrawal Requests</CardTitle>
              <CardDescription>Process affiliate withdrawal requests</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Affiliate</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell className="font-medium">
                        {withdrawal.affiliates.profiles.full_name}
                        <br />
                        <code className="text-xs">{withdrawal.affiliates.affiliate_code}</code>
                      </TableCell>
                      <TableCell>${withdrawal.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          withdrawal.status === 'pending' ? 'secondary' :
                          withdrawal.status === 'approved' ? 'default' :
                          withdrawal.status === 'paid' ? 'default' : 'destructive'
                        }>
                          {withdrawal.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(withdrawal.requested_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {withdrawal.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleWithdrawalReview(withdrawal.id, 'approved')}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleWithdrawalReview(withdrawal.id, 'rejected')}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        {withdrawal.status === 'approved' && (
                          <Button
                            size="sm"
                            onClick={() => handleWithdrawalReview(withdrawal.id, 'paid')}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AffiliateManagement;
