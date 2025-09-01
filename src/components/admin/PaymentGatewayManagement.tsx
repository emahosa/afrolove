
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface PaymentGatewaySettings {
  stripe_enabled: boolean;
  stripe_publishable_key: string;
  paystack_enabled: boolean;
  paystack_public_key: string;
}

const PaymentGatewayManagement: React.FC = () => {
  const [settings, setSettings] = useState<PaymentGatewaySettings>({
    stripe_enabled: false,
    stripe_publishable_key: '',
    paystack_enabled: false,
    paystack_public_key: ''
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
        .in('key', ['stripe_enabled', 'stripe_publishable_key', 'paystack_enabled', 'paystack_public_key']);

      if (error) throw error;

      const settingsObj: Partial<PaymentGatewaySettings> = {};
      data?.forEach(item => {
        const key = item.key as keyof PaymentGatewaySettings;
        if (key === 'stripe_enabled' || key === 'paystack_enabled') {
          settingsObj[key] = JSON.parse(item.value as string);
        } else {
          settingsObj[key] = JSON.parse(item.value as string);
        }
      });

      setSettings(prev => ({ ...prev, ...settingsObj }));
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to fetch payment gateway settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({
        key,
        value: JSON.stringify(value),
        category: 'payment',
        updated_by: (await supabase.auth.getUser()).data.user?.id
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('system_settings')
          .upsert(update, { onConflict: 'key' });

        if (error) throw error;
      }

      toast.success('Payment gateway settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save payment gateway settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading payment gateway settings...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Gateway Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Stripe Configuration</h3>
          <div className="flex items-center space-x-2">
            <Switch
              checked={settings.stripe_enabled}
              onCheckedChange={(checked) =>
                setSettings(prev => ({ ...prev, stripe_enabled: checked }))
              }
            />
            <Label>Enable Stripe</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="stripe_key">Stripe Publishable Key</Label>
            <Input
              id="stripe_key"
              type="text"
              placeholder="pk_test_..."
              value={settings.stripe_publishable_key}
              onChange={(e) =>
                setSettings(prev => ({ ...prev, stripe_publishable_key: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Paystack Configuration</h3>
          <div className="flex items-center space-x-2">
            <Switch
              checked={settings.paystack_enabled}
              onCheckedChange={(checked) =>
                setSettings(prev => ({ ...prev, paystack_enabled: checked }))
              }
            />
            <Label>Enable Paystack</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="paystack_key">Paystack Public Key</Label>
            <Input
              id="paystack_key"
              type="text"
              placeholder="pk_test_..."
              value={settings.paystack_public_key}
              onChange={(e) =>
                setSettings(prev => ({ ...prev, paystack_public_key: e.target.value }))
              }
            />
          </div>
        </div>

        <Button onClick={saveSettings} disabled={saving}>
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

export default PaymentGatewayManagement;
