
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AffiliateSettingsData {
  affiliate_program_enabled: boolean;
  is_free_tier_active: boolean;
  affiliate_subscription_commission_percent: number;
  affiliate_free_referral_compensation: number;
}

const AffiliateSettings: React.FC = () => {
  const [settings, setSettings] = useState<Partial<AffiliateSettingsData>>({
    affiliate_program_enabled: false,
    is_free_tier_active: false,
    affiliate_subscription_commission_percent: 0,
    affiliate_free_referral_compensation: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', [
          'affiliate_program_enabled',
          'is_free_tier_active',
          'affiliate_subscription_commission_percent',
          'affiliate_free_referral_compensation',
        ]);

      if (error) {
        console.error('Error fetching settings:', error);
        toast.error('Failed to fetch affiliate settings.');
      } else {
        console.log('Fetched settings data:', data);
        const settingsData = data.reduce((acc, { key, value }) => {
          try {
            // Parse the JSON value
            const parsedValue = JSON.parse(value);
            if (key === 'affiliate_program_enabled' || key === 'is_free_tier_active') {
              acc[key] = parsedValue === true || parsedValue === 'true';
            } else {
              acc[key] = Number(parsedValue) || 0;
            }
          } catch (e) {
            // Fallback for non-JSON values
            if (key === 'affiliate_program_enabled' || key === 'is_free_tier_active') {
              acc[key] = value === 'true' || value === true;
            } else {
              acc[key] = Number(value) || 0;
            }
          }
          return acc;
        }, {} as Partial<AffiliateSettingsData>);
        
        // Merge with defaults to ensure all fields have values
        setSettings({
          affiliate_program_enabled: false,
          is_free_tier_active: false,
          affiliate_subscription_commission_percent: 0,
          affiliate_free_referral_compensation: 0,
          ...settingsData
        });
      }
    } catch (error) {
      console.error('Unexpected error fetching settings:', error);
      toast.error('An error occurred while fetching settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    console.log('Saving settings:', settings);
    
    const updates = Object.entries(settings).map(([key, value]) => ({
      key,
      value,
    }));
    
    console.log('Sending updates to backend:', updates);

    try {
      const { data, error } = await supabase.functions.invoke('update-affiliate-settings', {
        body: { settings: updates },
      });

      console.log('Backend response:', { data, error });

      if (error) {
        console.error('Error from backend:', error);
        toast.error(`Failed to save settings: ${error.message || 'Unknown error'}`);
      } else {
        toast.success('Settings saved successfully.');
        // Refresh settings to confirm they were saved
        await fetchSettings();
      }
    } catch (error) {
      console.error('Unexpected error saving settings:', error);
      toast.error('An error occurred while saving settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (key: keyof AffiliateSettingsData, value: any) => {
    console.log(`Setting ${key} to ${value}`);
    setSettings(prev => ({...prev, [key]: value}));
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="animate-spin h-5 w-5" />
        <span>Loading settings...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Affiliate Program Settings</CardTitle>
        <CardDescription>Configure the affiliate program rules and compensation.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
          <Label htmlFor="program-enabled" className="flex flex-col space-y-1">
            <span>Affiliate Program Enabled</span>
            <span className="font-normal leading-snug text-muted-foreground">
              Master switch to enable or disable the entire affiliate program.
            </span>
          </Label>
          <Switch
            id="program-enabled"
            checked={settings.affiliate_program_enabled || false}
            onCheckedChange={(value) => handleSettingChange('affiliate_program_enabled', value)}
          />
        </div>
        <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
          <Label htmlFor="free-tier-enabled" className="flex flex-col space-y-1">
            <span>Free Referral Program Enabled</span>
            <span className="font-normal leading-snug text-muted-foreground">
              Enable or disable earnings for free user referrals who become active.
            </span>
          </Label>
          <Switch
            id="free-tier-enabled"
            checked={settings.is_free_tier_active || false}
            onCheckedChange={(value) => handleSettingChange('is_free_tier_active', value)}
          />
        </div>
        <div className="space-y-2 p-4 border rounded-lg">
          <Label htmlFor="commission-percent">Subscription Commission (%)</Label>
          <Input
            id="commission-percent"
            type="number"
            value={settings.affiliate_subscription_commission_percent || 0}
            onChange={(e) => handleSettingChange('affiliate_subscription_commission_percent', parseFloat(e.target.value) || 0)}
            placeholder="e.g., 10"
            min="0"
            max="100"
            step="0.1"
          />
           <p className="text-sm text-muted-foreground">The percentage of a subscription payment that goes to the affiliate.</p>
        </div>
        <div className="space-y-2 p-4 border rounded-lg">
          <Label htmlFor="free-referral-comp">Free Referral Compensation ($)</Label>
          <Input
            id="free-referral-comp"
            type="number"
            value={settings.affiliate_free_referral_compensation || 0}
            onChange={(e) => handleSettingChange('affiliate_free_referral_compensation', parseFloat(e.target.value) || 0)}
            placeholder="e.g., 0.10"
            min="0"
            step="0.01"
          />
           <p className="text-sm text-muted-foreground">The flat amount an affiliate earns for a referred free user who becomes active.</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
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
