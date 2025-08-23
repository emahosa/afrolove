
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface AffiliateApplicationFormProps {
  onSuccess?: () => void;
}

const AffiliateApplicationForm: React.FC<AffiliateApplicationFormProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: user?.email || '',
    phone: '',
    social_media_url: '',
    reason_to_join: '',
    usdt_wallet_address: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to submit an application');
      return;
    }

    setLoading(true);
    try {
      // Generate unique referral code
      const generateReferralCode = (name: string) => {
        const clean = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const timestamp = Date.now().toString().slice(-4);
        return `${clean.slice(0, 6)}${timestamp}`;
      };

      const referralCode = generateReferralCode(formData.full_name);

      // Check if user already has an application
      const { data: existingApp, error: checkError } = await supabase
        .from('affiliate_applications')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingApp) {
        toast.error('You already have an affiliate application');
        return;
      }

      // Insert new application
      const { error: insertError } = await supabase
        .from('affiliate_applications')
        .insert({
          user_id: user.id,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          social_media_url: formData.social_media_url,
          reason_to_join: formData.reason_to_join,
          usdt_wallet_address: formData.usdt_wallet_address,
          unique_referral_code: referralCode,
          status: 'pending'
        });

      if (insertError) {
        console.error('Error inserting application:', insertError);
        toast.error('Failed to submit application: ' + insertError.message);
        return;
      }

      toast.success('Application submitted successfully! We will review it soon.');
      
      // Reset form
      setFormData({
        full_name: '',
        email: user?.email || '',
        phone: '',
        social_media_url: '',
        reason_to_join: '',
        usdt_wallet_address: ''
      });

      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Apply to Become an Affiliate</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="social_media_url">Social Media URL</Label>
            <Input
              id="social_media_url"
              type="url"
              value={formData.social_media_url}
              onChange={(e) => handleInputChange('social_media_url', e.target.value)}
              placeholder="https://instagram.com/yourusername"
            />
          </div>

          <div>
            <Label htmlFor="usdt_wallet_address">USDT Wallet Address</Label>
            <Input
              id="usdt_wallet_address"
              value={formData.usdt_wallet_address}
              onChange={(e) => handleInputChange('usdt_wallet_address', e.target.value)}
              placeholder="Your USDT wallet address for payments"
            />
          </div>

          <div>
            <Label htmlFor="reason_to_join">Why do you want to become an affiliate? *</Label>
            <Textarea
              id="reason_to_join"
              value={formData.reason_to_join}
              onChange={(e) => handleInputChange('reason_to_join', e.target.value)}
              rows={4}
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              'Submit Application'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AffiliateApplicationForm;
