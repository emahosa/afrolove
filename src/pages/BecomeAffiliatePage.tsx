
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Star, Users, DollarSign } from "lucide-react";

const BecomeAffiliatePage = () => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    social_media_url: '',
    reason_to_join: '',
    usdt_wallet_address: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
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

      toast.success('Application submitted successfully! We will review your application and get back to you.');
      
      // Reset form
      setFormData({
        phone: '',
        social_media_url: '',
        reason_to_join: '',
        usdt_wallet_address: ''
      });
      
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">Become an Affiliate</h1>
        <p className="text-xl text-muted-foreground">
          Join our affiliate program and earn commissions by referring new users
        </p>
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

      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Affiliate Application</CardTitle>
          <CardDescription>
            Fill out this form to apply for our affiliate program
          </CardDescription>
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

export default BecomeAffiliatePage;
