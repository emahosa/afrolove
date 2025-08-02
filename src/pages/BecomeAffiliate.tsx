
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { AlertCircle } from 'lucide-react';

const BecomeAffiliatePage: React.FC = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [socialMediaUrl, setSocialMediaUrl] = useState('');
  const [reasonToJoin, setReasonToJoin] = useState('');
  const [usdtWalletAddress, setUsdtWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [programEnabled, setProgramEnabled] = useState(true);
  const [canApply, setCanApply] = useState(true);
  const [rejectionMessage, setRejectionMessage] = useState('');

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
    if (user?.user_metadata?.full_name && !fullName) {
      setFullName(user.user_metadata.full_name);
    } else if (user?.name && !fullName) {
      setFullName(user.name);
    }
    
    checkProgramStatus();
    checkApplicationEligibility();
  }, [user, fullName]);

  const checkProgramStatus = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'affiliate_program_enabled')
        .single();

      setProgramEnabled(data?.value === 'true');
    } catch (err) {
      console.error('Error checking program status:', err);
    }
  };

  const checkApplicationEligibility = async () => {
    if (!user?.id) return;

    try {
      // Check existing applications
      const { data: applications, error } = await supabase
        .from('affiliate_applications')
        .select('status, rejection_date')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error checking applications:', error);
        return;
      }

      if (applications && applications.length > 0) {
        const latestApp = applications[0];
        
        if (latestApp.status === 'pending') {
          setCanApply(false);
          setRejectionMessage('You have a pending application under review.');
          return;
        }
        
        if (latestApp.status === 'approved') {
          setCanApply(false);
          setRejectionMessage('You are already an approved affiliate.');
          return;
        }
        
        if (latestApp.status === 'rejected' && latestApp.rejection_date) {
          const rejectionDate = new Date(latestApp.rejection_date);
          const canReapplyDate = new Date(rejectionDate);
          canReapplyDate.setDate(canReapplyDate.getDate() + 60);
          
          if (new Date() < canReapplyDate) {
            setCanApply(false);
            setRejectionMessage(`You can reapply after ${canReapplyDate.toLocaleDateString()}.`);
            return;
          }
        }
      }
    } catch (err) {
      console.error('Error checking eligibility:', err);
    }
  };

  const validateForm = (): boolean => {
    if (!fullName.trim()) {
      toast.error("Full Name is required.");
      return false;
    }
    if (!email.trim()) {
      toast.error("Email is required.");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      toast.error("Please enter a valid email address.");
      return false;
    }
    if (!phone.trim()) {
      toast.error("Phone number is required.");
      return false;
    }
    if (!socialMediaUrl.trim()) {
      toast.error("Social Media URL is required.");
      return false;
    }
    try {
      new URL(socialMediaUrl);
    } catch (_) {
      toast.error("Please enter a valid Social Media URL.");
      return false;
    }
    if (!reasonToJoin.trim()) {
      toast.error("Reason to join is required.");
      return false;
    }
    if (!usdtWalletAddress.trim()) {
      toast.error("USDT wallet address is required.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    if (!user) {
      toast.error("You must be logged in to apply.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('submit-affiliate-application', {
        body: {
          full_name: fullName,
          email,
          phone,
          social_media_url: socialMediaUrl,
          reason_to_join: reasonToJoin,
          usdt_wallet_address: usdtWalletAddress,
        },
      });

      if (error) {
        console.error("Error submitting application:", error);
        let errorMessage = 'Failed to submit application. Please try again.';
        if (error.context && typeof error.context.error === 'string') {
          errorMessage = error.context.error;
        } else if (error.message) {
          try {
            const parsedError = JSON.parse(error.message);
            if (parsedError.error) {
              errorMessage = parsedError.error;
            }
          } catch (e) {
            if (error.message && !error.message.includes('FunctionReturnedNon2xx') && !error.message.includes('Relay Error')) {
              errorMessage = error.message;
            }
          }
        }
        toast.error(errorMessage);
      } else {
        toast.success(data?.message || "Application submitted successfully! We'll review it shortly.");
        setFullName('');
        setPhone('');
        setSocialMediaUrl('');
        setReasonToJoin('');
        setUsdtWalletAddress('');
        setCanApply(false);
        setRejectionMessage('Your application has been submitted and is under review.');
      }
    } catch (err: any) {
      console.error("Unexpected error submitting application:", err);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!programEnabled) {
    return (
      <div className="container mx-auto py-12 px-4 md:px-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-orange-600">
              <AlertCircle className="mr-2 h-5 w-5" />
              Affiliate Program Temporarily Paused
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              The affiliate program is currently paused. Please check back later for updates.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canApply) {
    return (
      <div className="container mx-auto py-12 px-4 md:px-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-blue-600">
              <AlertCircle className="mr-2 h-5 w-5" />
              Application Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{rejectionMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4 md:px-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight">Become an Affiliate Promoter</CardTitle>
          <CardDescription>
            Join our affiliate program and earn commissions by promoting Afroverse. Fill out the application below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="socialMediaUrl">Primary Social Media URL</Label>
              <Input
                id="socialMediaUrl"
                type="url"
                placeholder="https://instagram.com/yourprofile"
                value={socialMediaUrl}
                onChange={(e) => setSocialMediaUrl(e.target.value)}
                required
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">E.g., Instagram, TikTok, YouTube, Twitter link.</p>
            </div>
            <div>
              <Label htmlFor="usdtWalletAddress">USDT Wallet Address</Label>
              <Input
                id="usdtWalletAddress"
                type="text"
                placeholder="Your USDT wallet address for withdrawals"
                value={usdtWalletAddress}
                onChange={(e) => setUsdtWalletAddress(e.target.value)}
                required
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Required for receiving affiliate payouts via USDT.</p>
            </div>
            <div>
              <Label htmlFor="reasonToJoin">Why do you want to join?</Label>
              <Textarea
                id="reasonToJoin"
                placeholder="Tell us about your audience and why you're a good fit for Afroverse..."
                value={reasonToJoin}
                onChange={(e) => setReasonToJoin(e.target.value)}
                required
                rows={5}
                className="mt-1"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Submitting Application...' : 'Submit Application'}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            By submitting this application, you agree to our Affiliate Program Terms and Conditions.
            We will review your application and get back to you soon.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default BecomeAffiliatePage;
