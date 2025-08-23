import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type ApplicationStatus = 'none' | 'loading' | 'pending' | 'approved' | 'rejected';

const BecomeAffiliatePage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<ApplicationStatus>('loading');
  const [reapplyDate, setReapplyDate] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    socialProfileUrl: '',
    note: ''
  });

  const checkStatus = useCallback(async () => {
    if (!user?.id) {
      if (!authLoading) setStatus('none');
      return;
    }

    setStatus('loading');

    // 1. Check if user is already an approved affiliate
    const { data: approvedAffiliate, error: approvedError } = await supabase
      .from('affiliates')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (approvedError && approvedError.code !== 'PGRST116') { // PGRST116 = no rows found
      toast.error('Error checking affiliate status.');
      console.error(approvedError);
      setStatus('none');
      return;
    }

    if (approvedAffiliate) {
      setStatus('approved');
      return;
    }

    // 2. Check for an existing application
    const { data: application, error: appError } = await supabase
      .from('affiliate_applications')
      .select('status, can_reapply_after')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (appError && appError.code !== 'PGRST116') {
      toast.error('Error fetching application status.');
      console.error(appError);
      setStatus('none');
      return;
    }

    if (application) {
      if (application.status === 'pending') {
        setStatus('pending');
      } else if (application.status === 'rejected') {
        const canReapply = application.can_reapply_after ? new Date(application.can_reapply_after) < new Date() : false;
        if (canReapply) {
          setStatus('none'); // They can apply again
        } else {
          setStatus('rejected');
          setReapplyDate(application.can_reapply_after ? new Date(application.can_reapply_after) : null);
        }
      } else {
        // Should have been caught by the 'affiliates' check, but as a fallback
        setStatus('approved');
      }
    } else {
      setStatus('none'); // No application found, can apply
    }
  }, [user, authLoading]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error('You must be logged in to apply.');
      return;
    }

    if (!formData.socialProfileUrl.trim()) {
      toast.error('Please provide a social profile URL.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('affiliate_applications').insert({
        user_id: user.id,
        social_profile_url: formData.socialProfileUrl,
        note: formData.note,
      });

      if (error) {
        toast.error(error.message);
        console.error('Error submitting application:', error);
      } else {
        toast.success('Your application has been submitted!');
        setStatus('pending');
      }
    } catch (err: any) {
      toast.error('An unexpected error occurred.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const renderContent = () => {
    if (status === 'loading' || authLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin" />
        </div>
      );
    }

    if (!user) {
      return (
        <>
          <CardDescription>Please log in to apply to the affiliate program.</CardDescription>
          <Link to="/login" className="mt-4 inline-block">
            <Button>Go to Login</Button>
          </Link>
        </>
      );
    }

    switch (status) {
      case 'approved':
        return (
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-green-600">🎉 You are an Affiliate!</h3>
            <p>Your application was approved. You can access your dashboard now.</p>
            <Link to="/affiliate">
              <Button>Go to Affiliate Dashboard</Button>
            </Link>
          </div>
        );
      case 'pending':
        return (
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-yellow-600">Application Under Review</h3>
            <p>We have your application and will review it shortly. Thank you for your patience.</p>
          </div>
        );
      case 'rejected':
        return (
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-red-600">Application Rejected</h3>
            <p>
              Unfortunately, your previous application was not approved.
              {reapplyDate && ` You can apply again in ${formatDistanceToNow(reapplyDate)}.`}
            </p>
          </div>
        );
      case 'none':
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <CardDescription>
              Fill out the form below to apply for our affiliate program. We'll review your application and get back to you.
            </CardDescription>
            <div>
              <Label htmlFor="socialProfileUrl">Social Profile URL (e.g., Twitter, LinkedIn, etc.)</Label>
              <Input
                id="socialProfileUrl"
                name="socialProfileUrl"
                type="url"
                value={formData.socialProfileUrl}
                onChange={handleInputChange}
                required
                placeholder="https://twitter.com/your-handle"
              />
            </div>
            <div>
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                rows={4}
                placeholder="Tell us a bit about your audience or how you plan to promote our product."
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : 'Submit Application'}
            </Button>
          </form>
        );
      default:
        return <p>An unexpected error occurred. Please refresh the page.</p>;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Become an Affiliate</CardTitle>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
};

export default BecomeAffiliatePage;
