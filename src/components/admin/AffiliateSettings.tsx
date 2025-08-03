
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from 'sonner';
import { Loader2, Settings } from 'lucide-react';

interface AffiliateSettingsData {
  affiliate_program_enabled: boolean;
  affiliate_free_referral_enabled: boolean;
  affiliate_subscription_commission_enabled: boolean;
  affiliate_subscription_commission_percent: number;
  affiliate_free_referral_compensation: number;
}

const AffiliateSettings: React.FC = () => {
  const [settings, setSettings] = useState<AffiliateSettingsData>({
    affiliate_program_enabled: true,
    affiliate_free_referral_enabled: true,
    affiliate_subscription_commission_enabled: true,
    affiliate_subscription_commission_percent: 10,
    affiliate_free_referral_compensation: 0.10
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', [
          'affiliate_program_enabled',
          'affiliate_free_referral_enabled',
          'affiliate_subscription_commission_enabled',
          'affiliate_subscription_commission_percent',
          'affiliate_free_referral_compensation'
        ]);

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        const settingsMap: any = {};
        data.forEach(item => {
          if (item.key.includes('enabled')) {
            settingsMap[item.key] = item.value === 'true';
          } else {
            settingsMap[item.key] = parseFloat(item.value as string) || 0;
          }
        });

        setSettings(prev => ({ ...prev, ...settingsMap }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load affiliate settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: boolean | number) => {
    try {
      // Ensure value is not undefined or null
      const safeValue = value !== undefined && value !== null ? value : 
        (typeof value === 'boolean' ? false : 0);
      
      const { error } = await supabase
        .from('system_settings')
        .upsert({ 
          key,
          value: safeValue.toString(),
          category: 'affiliate',
          description: `Affiliate program setting: ${key}`,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'key' 
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error(`Error updating ${key}:`, error);
      throw error;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        updateSetting('affiliate_program_enabled', settings.affiliate_program_enabled),
        updateSetting('affiliate_free_referral_enabled', settings.affiliate_free_referral_enabled),
        updateSetting('affiliate_subscription_commission_enabled', settings.affiliate_subscription_commission_enabled),
        updateSetting('affiliate_subscription_commission_percent', settings.affiliate_subscription_commission_percent || 0),
        updateSetting('affiliate_free_referral_compensation', settings.affiliate_free_referral_compensation || 0)
      ]);

      toast.success('Affiliate settings updated successfully');
    } catch (error) {
      toast.error('Failed to update affiliate settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCompensationChange = (value: string, field: 'affiliate_free_referral_compensation' | 'affiliate_subscription_commission_percent') => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setSettings(prev => ({ 
        ...prev, 
        [field]: numValue
      }));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" /> Affiliate Program Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center p-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="mr-2 h-5 w-5" /> Affiliate Program Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Program Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="affiliate-program">Enable Affiliate Program</Label>
              <p className="text-sm text-muted-foreground">
                Master switch to enable/disable the entire affiliate program
              </p>
            </div>
            <Switch
              id="affiliate-program"
              checked={settings.affiliate_program_enabled}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, affiliate_program_enabled: checked }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="free-referral">Enable Free Referral Earnings</Label>
              <p className="text-sm text-muted-foreground">
                Allow affiliates to earn from free user referrals
              </p>
            </div>
            <Switch
              id="free-referral"
              checked={settings.affiliate_free_referral_enabled}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, affiliate_free_referral_enabled: checked }))
              }
              disabled={!settings.affiliate_program_enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="subscription-commission">Enable Subscription Commission</Label>
              <p className="text-sm text-muted-foreground">
                Allow affiliates to earn from subscription referrals
              </p>
            </div>
            <Switch
              id="subscription-commission"
              checked={settings.affiliate_subscription_commission_enabled}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, affiliate_subscription_commission_enabled: checked }))
              }
              disabled={!settings.affiliate_program_enabled}
            />
          </div>
        </div>

        <Separator />

        {/* Compensation Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Compensation Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="free-referral-amount">Free Referral Compensation ($)</Label>
              <Input
                id="free-referral-amount"
                type="number"
                step="0.01"
                min="0"
                value={settings.affiliate_free_referral_compensation || 0}
                onChange={(e) => handleCompensationChange(e.target.value, 'affiliate_free_referral_compensation')}
                disabled={!settings.affiliate_program_enabled || !settings.affiliate_free_referral_enabled}
              />
              <p className="text-xs text-muted-foreground">
                Amount earned per valid free user referral
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subscription-commission-percent">Subscription Commission (%)</Label>
              <Input
                id="subscription-commission-percent"
                type="number"
                min="0"
                max="100"
                value={settings.affiliate_subscription_commission_percent || 0}
                onChange={(e) => handleCompensationChange(e.target.value, 'affiliate_subscription_commission_percent')}
                disabled={!settings.affiliate_program_enabled || !settings.affiliate_subscription_commission_enabled}
              />
              <p className="text-xs text-muted-foreground">
                Percentage of subscription amount earned as commission
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AffiliateSettings;
