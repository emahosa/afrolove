
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Users, Star, DollarSign, TrendingUp } from "lucide-react";
import { toast } from 'sonner';

const Affiliate: React.FC = () => {
  const { user, isSubscriber } = useAuth();
  const [formData, setFormData] = useState({
    full_name: '',
    email: user?.email || '',
    phone: '',
    social_media_url: '',
    reason_to_join: '',
    usdt_wallet_address: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('affiliate_applications')
        .insert({
          user_id: user.id,
          ...formData
        });

      if (error) throw error;

      toast.success('Affiliate application submitted successfully! We will review your application and get back to you soon.');
      
      // Reset form
      setFormData({
        full_name: '',
        email: user?.email || '',
        phone: '',
        social_media_url: '',
        reason_to_join: '',
        usdt_wallet_address: ''
      });
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast.error(error.message || 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please log in to apply for the affiliate program.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isSubscriber()) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Subscription Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You need to be a subscriber to apply for the affiliate program. Please subscribe first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Become an Affiliate</h1>
        <p className="text-lg text-gray-600">
          Join our affiliate program and earn money by referring new users to our platform
        </p>
      </div>

      {/* Benefits Section */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6 text-center">
            <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Earn $0.10</h3>
            <p className="text-sm text-gray-600">For each active free user you refer</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 text-blue-500 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">10% Commission</h3>
            <p className="text-sm text-gray-600">From subscription payments of referred users</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-8 w-8 text-purple-500 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Track Referrals</h3>
            <p className="text-sm text-gray-600">Monitor your referral performance in real-time</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Star className="h-8 w-8 text-yellow-500 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Easy Payouts</h3>
            <p className="text-sm text-gray-600">Withdraw earnings to your USDT wallet</p>
          </CardContent>
        </Card>
      </div>

      {/* Application Form */}
      <Card>
        <CardHeader>
          <CardTitle>Affiliate Application</CardTitle>
          <CardDescription>
            Fill out the form below to apply for our affiliate program
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email address"
                  disabled
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter your phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="social_media_url">Social Media Profile *</Label>
                <Input
                  id="social_media_url"
                  name="social_media_url"
                  type="url"
                  required
                  value={formData.social_media_url}
                  onChange={handleInputChange}
                  placeholder="https://instagram.com/yourprofile"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="usdt_wallet_address">USDT Wallet Address (TRC20) *</Label>
              <Input
                id="usdt_wallet_address"
                name="usdt_wallet_address"
                type="text"
                required
                value={formData.usdt_wallet_address}
                onChange={handleInputChange}
                placeholder="Enter your USDT wallet address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason_to_join">Why do you want to join our affiliate program? *</Label>
              <Textarea
                id="reason_to_join"
                name="reason_to_join"
                required
                value={formData.reason_to_join}
                onChange={handleInputChange}
                placeholder="Tell us why you'd like to become an affiliate..."
                rows={4}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Affiliate;
