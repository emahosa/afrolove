
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
  const [rejectionDaysRemaining, setRejectionDaysRemaining] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    socialMediaUrl: '',
    reasonToJoin: '',
    usdtWalletAddress: ''
  });

  // Fetch user profile and auto-fill form
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) return;

      try {
        console.log('Fetching user data for:', user.id);
        
        // Get user metadata from auth
        let fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
        let email = user.email || '';
        
        // Try to get additional data from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', user.id)
          .single();

        if (!profileError && profileData) {
          console.log('Profile data found:', profileData);
          fullName = profileData.full_name || fullName;
          // Use profile username as fallback for email if needed
          if (!email) {
            email = profileData.username || '';
          }
        }

        // Update form data
        setFormData(prev => ({
          ...prev,
          fullName: fullName,
          email: email
        }));

        console.log('Form auto-filled with:', { fullName, email });

      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    if (user) {
      fetchUserData();
    }
  }, [user]);

  // Check application status
  useEffect(() => {
    const checkApplicationStatus = async () => {
      if (!user?.id) {
        if (!authLoading) setAppStatusLoading(false);
        return;
      }

      try {
        console.log('Checking application status for user:', user.id);
        const { data: applicationData, error: applicationError } = await supabase
          .from('affiliate_applications')
          .select('status, updated_at, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (applicationError) {
          console.error('Error checking application status:', applicationError);
        } else if (applicationData) {
          console.log('Application found:', applicationData.status);
          setApplicationStatus(applicationData.status as 'pending' | 'approved' | 'rejected');
          
          // For rejected applications, calculate remaining days
          if (applicationData.status === 'rejected') {
            const rejectionDate = new Date(applicationData.updated_at);
            const currentDate = new Date();
            const daysPassed = Math.floor((currentDate.getTime() - rejectionDate.getTime()) / (1000 * 3600 * 24));
            const remainingDays = 60 - daysPassed;
            
            if (remainingDays > 0) {
              setRejectionDaysRemaining(remainingDays);
            }
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
      toast.success('Affiliate application submitted successfully! We will review your application and get back to you.');
      setApplicationStatus('pending');
      
    } catch (err: any) {
      console.error('Application submission error:', err);
      
      // Handle specific error messages from the server
      if (err.message) {
        toast.error(err.message);
      } else {
        toast.error('Failed to submit application. Please try again.');
      }
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
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-600"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 mb-4">Please log in to access the affiliate application form.</p>
            <Link to="/login">
              <Button className="bg-violet-600 hover:bg-violet-700">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-center text-2xl">Become an Affiliate</CardTitle>
          </CardHeader>
          <CardContent>
            {applicationStatus === 'approved' && (
              <div className="text-center space-y-4 p-6">
                <div className="text-green-400">
                  <h3 className="text-xl font-semibold">✅ Application Approved!</h3>
                  <p>Your affiliate application has been approved. You can now access your affiliate dashboard.</p>
                </div>
                <Link to="/affiliate-dashboard">
                  <Button className="bg-violet-600 hover:bg-violet-700">Go to Affiliate Dashboard</Button>
                </Link>
              </div>
            )}

            {applicationStatus === 'pending' && (
              <div className="text-center space-y-4 p-6">
                <div className="text-yellow-400">
                  <h3 className="text-xl font-semibold">⏳ Application Under Review</h3>
                  <p>Your affiliate application is currently being reviewed. We'll notify you once it's processed.</p>
                </div>
              </div>
            )}

            {applicationStatus === 'rejected' && rejectionDaysRemaining && rejectionDaysRemaining > 0 && (
              <div className="text-center space-y-4 p-6">
                <div className="text-red-400">
                  <h3 className="text-xl font-semibold">❌ Application Rejected</h3>
                  <p>Your previous application was rejected. You can reapply in <strong>{rejectionDaysRemaining} days</strong>.</p>
                </div>
              </div>
            )}

            {(applicationStatus === 'none' || (applicationStatus === 'rejected' && (!rejectionDaysRemaining || rejectionDaysRemaining <= 0))) && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName" className="text-white">Full Name *</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required
                      readOnly
                      className="bg-gray-800 border-gray-600 text-gray-300 cursor-not-allowed"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-white">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      readOnly
                      className="bg-gray-800 border-gray-600 text-gray-300 cursor-not-allowed"
                      placeholder="Your email address"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone" className="text-white">Phone Number *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="bg-gray-800 border-gray-600 text-white focus:border-violet-500"
                    placeholder="+1234567890"
                  />
                </div>

                <div>
                  <Label htmlFor="socialMediaUrl" className="text-white">Social Media URL</Label>
                  <Input
                    id="socialMediaUrl"
                    name="socialMediaUrl"
                    type="url"
                    value={formData.socialMediaUrl}
                    onChange={handleInputChange}
                    className="bg-gray-800 border-gray-600 text-white focus:border-violet-500"
                    placeholder="https://instagram.com/youraccount"
                  />
                </div>

                <div>
                  <Label htmlFor="usdtWalletAddress" className="text-white">USDT Wallet Address *</Label>
                  <Input
                    id="usdtWalletAddress"
                    name="usdtWalletAddress"
                    value={formData.usdtWalletAddress}
                    onChange={handleInputChange}
                    placeholder="Your USDT wallet address for payments"
                    required
                    className="bg-gray-800 border-gray-600 text-white focus:border-violet-500"
                  />
                </div>

                <div>
                  <Label htmlFor="reasonToJoin" className="text-white">Why do you want to become an affiliate? *</Label>
                  <Textarea
                    id="reasonToJoin"
                    name="reasonToJoin"
                    value={formData.reasonToJoin}
                    onChange={handleInputChange}
                    rows={4}
                    required
                    className="bg-gray-800 border-gray-600 text-white focus:border-violet-500"
                    placeholder="Tell us why you want to join our affiliate program..."
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={submitting} 
                  className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50"
                  size="lg"
                >
                  {submitting ? 'Submitting Application...' : 'Submit Application'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BecomeAffiliate;
