
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Users, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';

interface AffiliateApplication {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  email: string;
  full_name: string;
  phone: string;
  reason_to_join: string;
  social_media_url: string;
  total_clicks: number;
  unique_referral_code: string | null;
  updated_at: string;
  profiles?: {
    full_name?: string;
    username?: string;
  };
}

export const AffiliateManagementTab = () => {
  const [applications, setApplications] = useState<AffiliateApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  const fetchApplications = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('affiliate_applications')
        .select(`
          *,
          profiles:user_id (
            full_name,
            username
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching affiliate applications:', error);
        toast.error('Failed to fetch affiliate applications');
        return;
      }

      console.log('Raw affiliate applications data:', data);

      // Type cast the data to ensure status is properly typed
      const transformedApplications: AffiliateApplication[] = data?.map(app => ({
        ...app,
        status: app.status as 'pending' | 'approved' | 'rejected',
        profiles: Array.isArray(app.profiles) ? app.profiles[0] : app.profiles
      })) || [];

      setApplications(transformedApplications);

      // Calculate stats
      const counts = {
        total: transformedApplications.length,
        pending: transformedApplications.filter(app => app.status === 'pending').length,
        approved: transformedApplications.filter(app => app.status === 'approved').length,
        rejected: transformedApplications.filter(app => app.status === 'rejected').length
      };

      console.log('Application counts:', counts);
      setStats(counts);

    } catch (error) {
      console.error('Error in fetchApplications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveApplication = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('affiliate_applications')
        .update({ status: 'approved' })
        .eq('id', applicationId);

      if (error) throw error;

      toast.success('Application approved successfully');
      fetchApplications();
    } catch (error) {
      console.error('Error approving application:', error);
      toast.error('Failed to approve application');
    }
  };

  const handleRejectApplication = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('affiliate_applications')
        .update({ status: 'rejected' })
        .eq('id', applicationId);

      if (error) throw error;

      toast.success('Application rejected');
      fetchApplications();
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Failed to reject application');
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        <span className="ml-2">Loading affiliate applications...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Applications List */}
      <Card>
        <CardHeader>
          <CardTitle>Affiliate Applications</CardTitle>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No affiliate applications found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((application) => (
                <div key={application.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {application.full_name || application.profiles?.full_name || application.profiles?.username || 'Unknown User'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {application.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Applied on: {new Date(application.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={
                        application.status === 'approved' ? 'default' :
                        application.status === 'pending' ? 'secondary' : 'destructive'
                      }
                    >
                      {application.status}
                    </Badge>
                    
                    {application.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveApplication(application.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectApplication(application.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AffiliateManagementTab;
