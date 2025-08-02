
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const BecomeAffiliate: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [canReapply, setCanReapply] = useState(false);
  const [rejectionDate, setRejectionDate] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    phone: '',
    socialMediaUrl: '',
    reasonToJoin: '',
    usdtWalletAddress: ''
  });

  useEffect(() => {
    const checkApplicationStatus = async () => {
      if (!user?.id) return;

      try {
        // Use RPC to check application status and reapply eligibility
        const { data: statusData, error: statusError } = await supabase.rpc('check_affiliate_application_status', {
          user_id_param: user.id
        });

        if (!statusError && statusData) {
          const status = statusData.status || 'none';
          setApplicationStatus(status);
          
          if (status === 'rejected') {
            setRejectionDate(statusData.rejection_date);
            
            // Check if user can reapply
            const { data: reapplyData, error: reapplyError } = await supabase.rpc('can_reapply_for_affiliate', {
              user_id_param: user.id
            });
            
            if (!reapplyError) {
              setCanReapply(reapplyData || false);
            }
          }
        }
      } catch (err) {
        console.error('Error checking application status:', err);
      } finally {
        setLoading(false);
      }
    };

    checkApplicationStatus();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('submit-affiliate-application', {
        body: {
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          social_media_url: formData.socialMediaUrl,
          reason_to_join: formData.reasonToJoin,
          usdt_wallet_address: formData.usdtWalletAddress
        }
      });

      if (error) {
        throw error;
      }

      toast.success('Affiliate application submitted successfully!');
      setApplicationStatus('pending');
    } catch (err: any) {
      console.error('Application submission error:', err);
      toast.error(err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Become an Affiliate</CardTitle>
        </CardHeader>
        <CardContent>
          {applicationStatus === 'approved' && (
            <div className="text-center space-y-4">
              <div className="text-green-600">
                <h3 className="text-lg font-semibold">Application Approved! 🎉</h3>
                <p>Your affiliate application has been approved. You can now access your affiliate dashboard.</p>
              </div>
              <Link to="/affiliate-dashboard">
                <Button>Go to Affiliate Dashboard</Button>
              </Link>
            </div>
          )}

          {applicationStatus === 'pending' && (
            <div className="text-center space-y-4">
              <div className="text-yellow-600">
                <h3 className="text-lg font-semibold">Application Under Review</h3>
                <p>Your affiliate application is currently being reviewed. We'll notify you once it's processed.</p>
              </div>
            </div>
          )}

          {applicationStatus === 'rejected' && !canReapply && (
            <div className="text-center space-y-4">
              <div className="text-red-600">
                <h3 className="text-lg font-semibold">Application Rejected</h3>
                <p>Your affiliate application was rejected. You can reapply after 60 days from the rejection date.</p>
                {rejectionDate && (
                  <p className="text-sm">
                    Rejection date: {new Date(rejectionDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          )}

          {(applicationStatus === 'none' || (applicationStatus === 'rejected' && canReapply)) && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="socialMediaUrl">Social Media URL</Label>
                <Input
                  id="socialMediaUrl"
                  name="socialMediaUrl"
                  type="url"
                  value={formData.socialMediaUrl}
                  onChange={handleInputChange}
                  placeholder="https://instagram.com/youraccount"
                  required
                />
              </div>

              <div>
                <Label htmlFor="usdtWalletAddress">USDT Wallet Address</Label>
                <Input
                  id="usdtWalletAddress"
                  name="usdtWalletAddress"
                  value={formData.usdtWalletAddress}
                  onChange={handleInputChange}
                  placeholder="Your USDT wallet address for withdrawals"
                  required
                />
              </div>

              <div>
                <Label htmlFor="reasonToJoin">Why do you want to become an affiliate?</Label>
                <Textarea
                  id="reasonToJoin"
                  name="reasonToJoin"
                  value={formData.reasonToJoin}
                  onChange={handleInputChange}
                  rows={4}
                  required
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BecomeAffiliate;
