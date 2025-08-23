
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface AffiliateSettingsData {
  affiliate_program_active: boolean;
  free_referral_program_active: boolean;
  subscription_commission_percentage: number;
  free_user_earning: number;
}

const AffiliateSettings: React.FC = () => {
  const [settings, setSettings] = useState<AffiliateSettingsData>({
    affiliate_program_active: true,
    free_referral_program_active: true,
    subscription_commission_percentage: 10,
    free_user_earning: 0.10
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-affiliate-settings');

      if (error) {
        console.error('Error fetching affiliate settings:', error);
        toast.error('Failed to load affiliate settings');
        return;
      }

      if (data?.settings) {
        setSettings({
          affiliate_program_active: data.settings.affiliate_program_active ?? true,
          free_referral_program_active: data.settings.free_referral_program_active ?? true,
          subscription_commission_percentage: data.settings.subscription_commission_percentage ?? 10,
          free_user_earning: data.settings.free_user_earning ?? 0.10
        });
      }
    } catch (err) {
      console.error('Error in fetchSettings:', err);
      toast.error('Failed to load affiliate settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      
      // Prepare settings array for the edge function
      const settingsArray = [
        {
          key: 'affiliate_program_active',
          value: settings.affiliate_program_active
        },
        {
          key: 'free_referral_program_active',
          value: settings.free_referral_program_active
        },
        {
          key: 'subscription_commission_percentage',
          value: settings.subscription_commission_percentage
        },
        {
          key: 'free_user_earning',
          value: settings.free_user_earning
        }
      ];

      const { data, error } = await supabase.functions.invoke('update-affiliate-settings', {
        body: { settings: settingsArray }
      });

      if (error) {
        console.error('Error updating affiliate settings:', error);
        toast.error(error.message || 'Failed to update affiliate settings');
        return;
      }

      toast.success('Affiliate settings updated successfully');
    } catch (err: any) {
      console.error('Error in handleSaveSettings:', err);
      toast.error('Failed to update affiliate settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Affiliate Settings</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading settings...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Affiliate Settings</CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure affiliate program settings and commission rates
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="affiliate_program_active">Affiliate Program Active</Label>
                <p className="text-sm text-muted-foreground">
                  Enable or disable the entire affiliate program
                </p>
              </div>
              <Switch
                id="affiliate_program_active"
                checked={settings.affiliate_program_active}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, affiliate_program_active: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="free_referral_program_active">Free Referral Program</Label>
                <p className="text-sm text-muted-foreground">
                  Enable earnings from free user referrals
                </p>
              </div>
              <Switch
                id="free_referral_program_active"
                checked={settings.free_referral_program_active}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, free_referral_program_active: checked })
                }
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subscription_commission_percentage">
                Subscription Commission (%)
              </Label>
              <Input
                id="subscription_commission_percentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={settings.subscription_commission_percentage}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    subscription_commission_percentage: parseFloat(e.target.value) || 0
                  })
                }
              />
              <p className="text-sm text-muted-foreground">
                Percentage of subscription price paid to affiliates
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="free_user_earning">Free User Earning ($)</Label>
              <Input
                id="free_user_earning"
                type="number"
                min="0"
                step="0.01"
                value={settings.free_user_earning}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    free_user_earning: parseFloat(e.target.value) || 0
                  })
                }
              />
              <p className="text-sm text-muted-foreground">
                Amount paid to affiliates for each active free user
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AffiliateSettings;
