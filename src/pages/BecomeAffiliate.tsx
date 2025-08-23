
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, DollarSign, Users, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import AffiliateApplicationForm from '@/components/affiliate/AffiliateApplicationForm';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const BecomeAffiliate = () => {
  const { user, isSubscriber, isAffiliate } = useAuth();
  const [hasApplication, setHasApplication] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkApplication = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('affiliate_applications')
          .select('status')
          .eq('user_id', user.id)
          .single();

        if (data) {
          setHasApplication(true);
          setApplicationStatus(data.status);
        }
      } catch (error) {
        console.error('Error checking application:', error);
      } finally {
        setLoading(false);
      }
    };

    checkApplication();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Join Our Affiliate Program</CardTitle>
            <CardDescription>Sign in to apply as an affiliate partner</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/login">
              <Button className="w-full">Sign In to Apply</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAffiliate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle>You're Already an Affiliate!</CardTitle>
            <CardDescription>Access your affiliate dashboard to manage your referrals</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/affiliate">
              <Button className="w-full">Go to Affiliate Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasApplication) {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'approved': return 'bg-green-500';
        case 'rejected': return 'bg-red-500';
        default: return 'bg-yellow-500';
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Application Status</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Badge className={getStatusColor(applicationStatus || '')}>
              {applicationStatus?.charAt(0).toUpperCase() + applicationStatus?.slice(1)}
            </Badge>
            <p className="text-muted-foreground">
              {applicationStatus === 'pending' && 'Your application is being reviewed. We will notify you once it has been processed.'}
              {applicationStatus === 'approved' && 'Congratulations! Your application has been approved. You can now access the affiliate dashboard.'}
              {applicationStatus === 'rejected' && 'Your application was not approved at this time. You may reapply in the future.'}
            </p>
            {applicationStatus === 'approved' && (
              <Link to="/affiliate">
                <Button className="w-full">Access Affiliate Dashboard</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isSubscriber) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Subscription Required</CardTitle>
            <CardDescription>You need an active subscription to apply for our affiliate program</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/subscription">
              <Button className="w-full">Subscribe Now</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12 pt-8">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Become an <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">Affiliate</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Join our affiliate program and earn money by referring new users to our platform
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader className="text-center">
              <DollarSign className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <CardTitle className="text-white">High Commissions</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-300">Earn 10% commission on every subscription from your referrals</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader className="text-center">
              <Users className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <CardTitle className="text-white">Free Bonuses</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-300">Get $0.10 for every user who visits the subscription page through your link</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader className="text-center">
              <TrendingUp className="h-12 w-12 text-purple-400 mx-auto mb-4" />
              <CardTitle className="text-white">Real-time Tracking</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-300">Monitor your clicks, referrals, and earnings in real-time</p>
            </CardContent>
          </Card>
        </div>

        {/* Application Form */}
        <AffiliateApplicationForm />
      </div>
    </div>
  );
};

export default BecomeAffiliate;
