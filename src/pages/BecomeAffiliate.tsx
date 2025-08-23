
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
  const { user, loading: authLoading } = useAuth();
  const [appStatusLoading, setAppStatusLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [canReapply, setCanReapply] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    socialMediaUrl: '',
    reasonToJoin: '',
    usdtWalletAddress: ''
  });

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;

      try {
        console.log('Fetching profile for user:', user.id);
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
        } else if (profileData) {
          console.log('Profile data found:', profileData);
          setUserProfile(profileData);
          setFormData(prev => ({
            ...prev,
            fullName: profileData.full_name || user.user_metadata?.full_name || user.name || '',
            email: user.email || profileData.username || ''
          }));
        } else {
          // Fallback to auth user data
          console.log('No profile found, using auth data');
          setFormData(prev => ({
            ...prev,
            fullName: user.user_metadata?.full_name || user.name || '',
            email: user.email || ''
          }));
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Fallback to auth user data
        setFormData(prev => ({
          ...prev,
          fullName: user.user_metadata?.full_name || user.name || '',
          email: user.email || ''
        }));
      }
    };

    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  useEffect(() => {
    const checkApplicationStatus = async () => {
      if (!user?.id) {
        if (!authLoading) setAppStatusLoading(false);
        return;
      }

      try {
        console.log('Checking application status for user:', user.id);
        const { data: applicationData, error: applicationError } = await supabase.functions.invoke('get-affiliate-application-status');

        if (applicationError) {
          console.error('Error checking application status:', applicationError);
        } else if (applicationData) {
          console.log('Application status:', applicationData.status);
          setApplicationStatus(applicationData.status as 'pending' | 'approved' | 'rejected');
          
          // For rejected applications, check if 60 days have passed since last update
          if (applicationData.status === 'rejected') {
            const rejectionDate = new Date(applicationData.updated_at);
            const currentDate = new Date();
            const daysDifference = (currentDate.getTime() - rejectionDate.getTime()) / (1000 * 3600 * 24);
            setCanReapply(daysDifference >= 60);
          }
        } else {
          console.log('No application found');
          setApplicationStatus('none');
        }
      } catch (err) {
        console.error('Error checking application status:', err);
      } finally {
        setAppStatusLoading(false);
      }
    };

    checkApplicationStatus();
  }, [user, authLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error('Please log in to submit an application');
      return;
    }

    if (!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim() || 
        !formData.reasonToJoin.trim() || !formData.usdtWalletAddress.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      console.log('Submitting application with data:', {
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        social_media_url: formData.socialMediaUrl,
        reason_to_join: formData.reasonToJoin,
        usdt_wallet_address: formData.usdtWalletAddress
      });

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
        console.error('Application submission error:', error);
        throw error;
      }

      console.log('Application submitted successfully:', data);
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

  if (authLoading || appStatusLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please log in to access the affiliate application form.</p>
            <Link to="/login" className="mt-4 inline-block">
              <Button>Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
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
                    className="bg-gray-50 dark:bg-gray-800"
                    placeholder="Your full name"
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
                    className="bg-gray-50 dark:bg-gray-800"
                    placeholder="Your email address"
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
                  placeholder="+1234567890"
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
                  placeholder="Tell us why you want to join our affiliate program..."
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
