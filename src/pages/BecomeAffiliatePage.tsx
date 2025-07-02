import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; // Assuming you might want a textarea for 'reason_to_join'
import { toast } from 'sonner';
import LockedFeatureNotice from '@/components/ui/LockedFeatureNotice';

const BecomeAffiliatePage: React.FC = () => {
  const { user, isSubscriber, isAffiliate, affiliateApplicationStatus, refreshAffiliateApplicationStatus } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(''); // Assuming phone is not in user metadata by default
  const [socialMediaUrl, setSocialMediaUrl] = useState('');
  const [reasonToJoin, setReasonToJoin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Refresh status when page loads, in case it changed elsewhere
    refreshAffiliateApplicationStatus();
  }, [refreshAffiliateApplicationStatus]);

  useEffect(() => {
    if (user) {
        setFullName(user?.user_metadata?.full_name || user?.name || '');
        setEmail(user?.email || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!socialMediaUrl || !reasonToJoin || !fullName || !email || !phone) {
      toast.error('Please fill in all required fields.');
      setIsSubmitting(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('submit-affiliate-application', {
        body: {
          full_name: fullName,
          email: email,
          phone: phone,
          social_media_url: socialMediaUrl,
          reason_to_join: reasonToJoin,
        },
      });

      if (error) {
        console.error('Error submitting affiliate application:', error);
        toast.error(error.message || 'Failed to submit application. Please try again.');
      } else {
        toast.success(data.message || 'Application submitted successfully! We will review it shortly.');
        await refreshAffiliateApplicationStatus(); // Refresh status after submission
        navigate('/dashboard'); // Redirect to dashboard or a confirmation page
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      toast.error(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isSubscriber() && affiliateApplicationStatus !== 'approved' && affiliateApplicationStatus !== 'pending') {
    // If not a subscriber and no pending/approved app, show lock screen.
    // This also handles 'not_eligible_not_subscriber'
    return <LockedFeatureNotice message="You must be a subscriber to apply for the affiliate program." />;
  }

  if (isAffiliate() || affiliateApplicationStatus === 'approved') {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Affiliate Program</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You are already an affiliate! You can view your dashboard to track your progress.</p>
            <Button onClick={() => navigate('/affiliate')} className="mt-4">Go to Affiliate Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (affiliateApplicationStatus === 'pending') {
     return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Application Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Your affiliate application is currently under review. We'll notify you once a decision is made.</p>
            <Button onClick={() => navigate('/dashboard')} className="mt-4">Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Only show form if 'eligible' or 'rejected' (assuming rejected can reapply, current SQL allows this)
  // or 'unknown' (optimistically show form, backend will validate)
  if (affiliateApplicationStatus !== 'eligible' && affiliateApplicationStatus !== 'rejected' && affiliateApplicationStatus !== 'unknown') {
     // This case should ideally not be reached if the above checks are comprehensive
     // e.g. 'not_applicable_is_affiliate' or 'not_eligible_not_subscriber'
    return (
         <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <Card>
                <CardHeader><CardTitle>Affiliate Program</CardTitle></CardHeader>
                <CardContent><p>Your current status does not allow applying for the affiliate program at this time.</p></CardContent>
            </Card>
        </div>
    );
  }


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Become an Affiliate</CardTitle>
          <CardDescription>
            Join our affiliate program and earn by referring users. Please fill out the form below.
            You must be an active subscriber to apply.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your Full Name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your Email Address" required />
            </div>
             <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your Phone Number" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="socialMediaUrl">Social Media Profile URL</Label>
              <Input id="socialMediaUrl" value={socialMediaUrl} onChange={(e) => setSocialMediaUrl(e.target.value)} placeholder="e.g., https://twitter.com/yourprofile" required />
              <p className="text-xs text-muted-foreground">
                Link to your primary social media profile (e.g., Twitter, Instagram, YouTube, TikTok).
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reasonToJoin">Why do you want to join?</Label>
              <Textarea
                id="reasonToJoin"
                value={reasonToJoin}
                onChange={(e) => setReasonToJoin(e.target.value)}
                placeholder="Briefly explain your interest in our affiliate program and how you plan to promote Afroverse."
                required
                rows={4}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting || !isSubscriber()}>
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </Button>
          </CardFooter>
        </form>
      </Card>
       {!isSubscriber() && (
        <p className="text-red-500 text-sm mt-4 text-center">
            Note: You must be an active subscriber to submit an application.
            Your application will be rejected if you are not subscribed.
        </p>
      )}
    </div>
  );
};

export default BecomeAffiliatePage;
