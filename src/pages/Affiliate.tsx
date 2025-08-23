
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Star, Users, DollarSign, TrendingUp, ExternalLink, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import AffiliateLinks from '@/components/affiliate/AffiliateLinks';
import AffiliateWallet from '@/components/affiliate/AffiliateWallet';
import EarningsBreakdown from '@/components/affiliate/EarningsBreakdown';
import ReferralsList from '@/components/affiliate/ReferralsList';
import PayoutHistory from '@/components/affiliate/PayoutHistory';
import LockScreen from '@/components/LockScreen';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAffiliateData } from '@/hooks/useAffiliateData';

// Combined Affiliate Page

import PropTypes from 'prop-types';

// BecomeAffiliateTab Component
const BecomeAffiliateTab = ({ onApplicationSubmitted, applicationStatus }) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    social_media_url: '',
    reason_to_join: '',
    usdt_wallet_address: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to apply');
      return;
    }
    if (!formData.phone || !formData.reason_to_join || !formData.usdt_wallet_address) {
      toast.error('Please fill in all required fields');
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('submit-affiliate-application', {
        body: {
          full_name: user.user_metadata?.full_name || user.email,
          email: user.email,
          phone: formData.phone,
          social_media_url: formData.social_media_url,
          reason_to_join: formData.reason_to_join,
          usdt_wallet_address: formData.usdt_wallet_address
        }
      });
      if (error) throw error;
      onApplicationSubmitted();
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (applicationStatus === 'pending') {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Application Pending</CardTitle>
          <CardDescription>Your affiliate application is currently under review. We'll notify you once a decision has been made.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Patience is a virtue!</AlertTitle>
            <AlertDescription>
              Our team is carefully reviewing your application. This process usually takes 24-48 hours. Thank you for your interest!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (applicationStatus === 'approved') {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>You are an Approved Affiliate!</CardTitle>
          <CardDescription>Welcome to the affiliate program. You can now access your dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Congratulations!</AlertTitle>
            <AlertDescription>
              You are an approved affiliate. Head over to the dashboard to get your referral links and start earning.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (applicationStatus === 'rejected') {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Application Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Application Rejected</AlertTitle>
            <AlertDescription>
              We regret to inform you that your affiliate application was not approved at this time. For more details, please contact our support team.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Become an Affiliate</h1>
        <p className="text-xl text-muted-foreground">Join our program and earn by referring new users.</p>
      </div>
      <div className="grid gap-8 md:grid-cols-3 mb-8">
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center mb-4">
              <DollarSign className="h-12 w-12 text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold text-white text-center mb-2">Earn 30% Commission</h3>
            <p className="text-sm text-muted-foreground text-center">
              Get 30% commission on every subscription from your referrals
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center mb-4">
              <Users className="h-12 w-12 text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold text-white text-center mb-2">Growing Community</h3>
            <p className="text-sm text-muted-foreground text-center">
              Join our rapidly expanding community of music creators
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center mb-4">
              <Star className="h-12 w-12 text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold text-white text-center mb-2">Premium Support</h3>
            <p className="text-sm text-muted-foreground text-center">
              Get dedicated support and marketing materials
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Affiliate Application</CardTitle>
          <CardDescription>Fill out this form to apply.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-white">Full Name</Label>
                <Input
                  id="full_name"
                  value={user?.user_metadata?.full_name || user?.email || ''}
                  readOnly
                  className="bg-gray-800 border-gray-700 text-gray-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email Address</Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  readOnly
                  className="bg-gray-800 border-gray-700 text-gray-400"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-white">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="social_media_url" className="text-white">Social Media Profile URL</Label>
                <Input
                  id="social_media_url"
                  type="url"
                  placeholder="https://twitter.com/yourusername"
                  value={formData.social_media_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, social_media_url: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="usdt_wallet_address" className="text-white">
                USDT Wallet Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="usdt_wallet_address"
                placeholder="Your USDT wallet address for payments"
                value={formData.usdt_wallet_address}
                onChange={(e) => setFormData(prev => ({ ...prev, usdt_wallet_address: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason_to_join" className="text-white">
                Why do you want to join our affiliate program? <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason_to_join"
                placeholder="Tell us about your motivation, experience, and how you plan to promote our platform..."
                value={formData.reason_to_join}
                onChange={(e) => setFormData(prev => ({ ...prev, reason_to_join: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white min-h-[120px]"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting Application...
                </>
              ) : (
                'Submit Application'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

BecomeAffiliateTab.propTypes = {
  onApplicationSubmitted: PropTypes.func.isRequired,
  applicationStatus: PropTypes.string,
};

// AffiliateDashboardTab Component
const AffiliateDashboardTab = () => {
  const { user, isSubscriber, loading: authLoading } = useAuth();
  const { stats, links, wallet, earnings, loading, refresh } = useAffiliateData();

  if (authLoading || loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin" /></div>;
  }
  
  if (!user) {
    return <Card><CardHeader><CardTitle>Access Denied</CardTitle></CardHeader><CardContent><p>Please log in.</p></CardContent></Card>;
  }
  
  if (!isSubscriber()) {
    return <LockScreen message="Please subscribe to access the affiliate dashboard." buttonText="Subscribe" />;
  }

  return (
    <div className="py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Affiliate Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.user_metadata?.full_name || 'Affiliate'}!</p>
        </div>
        <Button onClick={refresh} variant="outline">Refresh Data</Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReferrals}</div>
            <p className="text-xs text-muted-foreground">People you've referred</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total commission earned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Clicks to referrals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clicksCount}</div>
            <p className="text-xs text-muted-foreground">Link clicks received</p>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-8">
        <AffiliateWallet wallet={wallet} onWithdrawal={refresh} />
        <AffiliateLinks links={links} />
        <EarningsBreakdown earnings={earnings} />
        <ReferralsList earnings={earnings} />
        <PayoutHistory affiliateId={user.id} />
      </div>
    </div>
  );
};

// Main AffiliatePage Component
const AffiliatePage = () => {
  const { user, loading: authLoading } = useAuth();
  const [isApprovedAffiliate, setIsApprovedAffiliate] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('become-affiliate');

  const checkAffiliateStatus = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-affiliate-application-status');
      if (error) throw error;

      setApplicationStatus(data?.status || null);
      if (data?.status === 'approved') {
        setIsApprovedAffiliate(true);
        setActiveTab('dashboard');
      } else {
        setIsApprovedAffiliate(false);
        setActiveTab('become-affiliate');
      }
    } catch (err) {
      console.error('Error checking affiliate status:', err);
      toast.error('Failed to check affiliate status.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      checkAffiliateStatus();
    }
  }, [authLoading, checkAffiliateStatus]);

  const handleApplicationSubmitted = () => {
    checkAffiliateStatus();
  };

  if (loading || authLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="become-affiliate">Become an Affiliate</TabsTrigger>
          <TabsTrigger value="dashboard" disabled={!isApprovedAffiliate}>Affiliate Dashboard</TabsTrigger>
        </TabsList>
        <TabsContent value="become-affiliate">
          <BecomeAffiliateTab onApplicationSubmitted={handleApplicationSubmitted} applicationStatus={applicationStatus} />
        </TabsContent>
        <TabsContent value="dashboard">
          {isApprovedAffiliate ? <AffiliateDashboardTab /> : <div className="text-center py-12">...</div>}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AffiliatePage;
