
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from 'sonner';
import { Loader2, Settings } from 'lucide-react';

interface AffiliateSettingsState {
  affiliate_program_enabled: boolean;
  affiliate_free_referral_enabled: boolean;
  affiliate_subscription_commission_enabled: boolean;
  affiliate_free_referral_compensation: number;
  affiliate_subscription_commission_percent: number;
  affiliate_minimum_withdrawal: number;
  affiliate_withdrawal_fee_percent: number;
}

const AffiliateSettings: React.FC = () => {
  const [settings, setSettings] = useState<AffiliateSettingsState>({
    affiliate_program_enabled: true,
    affiliate_free_referral_enabled: true,
    affiliate_subscription_commission_enabled: true,
    affiliate_free_referral_compensation: 0.10,
    affiliate_subscription_commission_percent: 10,
    affiliate_minimum_withdrawal: 50,
    affiliate_withdrawal_fee_percent: 10
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-affiliate-settings');

      if (error) {
        toast.error('Failed to fetch affiliate settings');
        console.error('Error fetching settings:', error);
        return;
      }

      if (data?.settings) {
        setSettings({
          affiliate_program_enabled: data.settings.affiliate_program_enabled === 'true',
          affiliate_free_referral_enabled: data.settings.affiliate_free_referral_enabled === 'true',
          affiliate_subscription_commission_enabled: data.settings.affiliate_subscription_commission_enabled === 'true',
          affiliate_free_referral_compensation: parseFloat(data.settings.affiliate_free_referral_compensation || '0.10'),
          affiliate_subscription_commission_percent: parseFloat(data.settings.affiliate_subscription_commission_percent || '10'),
          affiliate_minimum_withdrawal: parseFloat(data.settings.affiliate_minimum_withdrawal || '50'),
          affiliate_withdrawal_fee_percent: parseFloat(data.settings.affiliate_withdrawal_fee_percent || '10')
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to fetch affiliate settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        key,
        value: value.toString()
      }));

      const { error } = await supabase.functions.invoke('update-affiliate-settings', {
        body: { settings: settingsArray }
      });

      if (error) {
        toast.error('Failed to update affiliate settings');
        console.error('Error updating settings:', error);
      } else {
        toast.success('Affiliate settings updated successfully');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to update affiliate settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (key: keyof AffiliateSettingsState, value: boolean | number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Affiliate Program Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="mr-2 h-5 w-5" />
          Affiliate Program Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Program Controls */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Program Controls</h3>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="program-enabled">Enable Affiliate Program</Label>
            <Switch
              id="program-enabled"
              checked={settings.affiliate_program_enabled}
              onCheckedChange={(checked) => handleSettingChange('affiliate_program_enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="free-referral-enabled">Enable Free Referral Earnings</Label>
            <Switch
              id="free-referral-enabled"
              checked={settings.affiliate_free_referral_enabled}
              onCheckedChange={(checked) => handleSettingChange('affiliate_free_referral_enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="commission-enabled">Enable Subscription Commission</Label>
            <Switch
              id="commission-enabled"
              checked={settings.affiliate_subscription_commission_enabled}
              onCheckedChange={(checked) => handleSettingChange('affiliate_subscription_commission_enabled', checked)}
            />
          </div>
        </div>

        <Separator />

        {/* Earning Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Earning Settings</h3>
          
          <div className="space-y-2">
            <Label htmlFor="free-referral-amount">Free Referral Compensation (USD)</Label>
            <Input
              id="free-referral-amount"
              type="number"
              step="0.01"
              min="0"
              value={settings.affiliate_free_referral_compensation}
              onChange={(e) => handleSettingChange('affiliate_free_referral_compensation', parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commission-percent">Subscription Commission Percentage (%)</Label>
            <Input
              id="commission-percent"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={settings.affiliate_subscription_commission_percent}
              onChange={(e) => handleSettingChange('affiliate_subscription_commission_percent', parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        <Separator />

        {/* Withdrawal Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Withdrawal Settings</h3>
          
          <div className="space-y-2">
            <Label htmlFor="min-withdrawal">Minimum Withdrawal Amount (USD)</Label>
            <Input
              id="min-withdrawal"
              type="number"
              step="1"
              min="1"
              value={settings.affiliate_minimum_withdrawal}
              onChange={(e) => handleSettingChange('affiliate_minimum_withdrawal', parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="withdrawal-fee">Withdrawal Fee Percentage (%)</Label>
            <Input
              id="withdrawal-fee"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={settings.affiliate_withdrawal_fee_percent}
              onChange={(e) => handleSettingChange('affiliate_withdrawal_fee_percent', parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AffiliateSettings;
