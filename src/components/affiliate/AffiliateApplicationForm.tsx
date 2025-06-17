
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Users, DollarSign, Share } from 'lucide-react';

const applicationSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  socialMediaUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  reason: z.string().min(50, 'Please provide at least 50 characters explaining why you want to join'),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

const AffiliateApplicationForm = () => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      fullName: user?.name || '',
      email: user?.email || '',
    }
  });

  const onSubmit = async (data: ApplicationFormData) => {
    if (!user) {
      toast.error('You must be logged in to apply');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('affiliate_applications')
        .insert({
          user_id: user.id,
          full_name: data.fullName,
          email: data.email,
          phone: data.phone || null,
          social_media_url: data.socialMediaUrl || null,
          reason: data.reason,
        });

      if (error) throw error;

      setApplicationSubmitted(true);
      toast.success('Application submitted successfully! We\'ll review it and get back to you.');
      reset();
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (applicationSubmitted) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-green-600">Application Submitted!</CardTitle>
          <CardDescription>
            Thank you for your interest in becoming an Afroverse affiliate. We'll review your application and contact you within 2-3 business days.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Benefits Section */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="text-center">
            <Users className="h-8 w-8 mx-auto text-primary mb-2" />
            <CardTitle className="text-lg">Promote Afroverse</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Share Afroverse with your audience and help them discover AI music creation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <DollarSign className="h-8 w-8 mx-auto text-primary mb-2" />
            <CardTitle className="text-lg">15% Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Earn 15% recurring commission from every subscription you refer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <Share className="h-8 w-8 mx-auto text-primary mb-2" />
            <CardTitle className="text-lg">Unique Link</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Get your personalized referral link to track all your referrals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Application Form */}
      <Card>
        <CardHeader>
          <CardTitle>Become an Afroverse Affiliate</CardTitle>
          <CardDescription>
            Join our affiliate program and start earning commissions by promoting Afroverse AI music platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  {...register('fullName')}
                  placeholder="Enter your full name"
                />
                {errors.fullName && (
                  <p className="text-sm text-red-600">{errors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="Enter your phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="socialMediaUrl">Social Media URL</Label>
                <Input
                  id="socialMediaUrl"
                  {...register('socialMediaUrl')}
                  placeholder="https://instagram.com/yourhandle"
                />
                {errors.socialMediaUrl && (
                  <p className="text-sm text-red-600">{errors.socialMediaUrl.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Why do you want to join our affiliate program? *</Label>
              <Textarea
                id="reason"
                {...register('reason')}
                placeholder="Tell us about your audience, promotion strategy, and why you're interested in promoting Afroverse..."
                rows={4}
              />
              {errors.reason && (
                <p className="text-sm text-red-600">{errors.reason.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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

export default AffiliateApplicationForm;
