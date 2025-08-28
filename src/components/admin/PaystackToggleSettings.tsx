import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Shield, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const PaystackToggleSettings = () => {
  const [paystackEnabled, setPaystackEnabled] = useState(false);
  const [publicKey, setPublicKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadPaystackSettings();
  }, []);

  const loadPaystackSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .in('key', ['paystack_enabled', 'paystack_public_key']);

      if (error) {
        console.error('Error loading Paystack settings:', error);
        toast.error('Failed to load Paystack settings');
        return;
      }

      if (data) {
        const settings = data.reduce((acc, setting) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {});

        setPaystackEnabled(settings.paystack_enabled?.enabled === true);
        setPublicKey(settings.paystack_public_key?.key || '');
      }
    } catch (error) {
      console.error('Error loading Paystack settings:', error);
      toast.error('Failed to load Paystack settings');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('User not authenticated');
        return;
      }

      const settingsToUpdate = [
        { key: 'paystack_enabled', value: { enabled: paystackEnabled } },
        { key: 'paystack_public_key', value: { key: publicKey } },
      ];

      for (const setting of settingsToUpdate) {
        await supabase
          .from('system_settings')
          .upsert({
            key: setting.key,
            value: setting.value,
            category: 'payment',
            updated_by: user.id,
          }, { onConflict: 'key' });
      }

      toast.success('Paystack settings updated successfully');
    } catch (error) {
      console.error('Error updating Paystack settings:', error);
      toast.error('Failed to update Paystack settings');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Paystack Settings
          </CardTitle>
          <CardDescription>Loading Paystack settings...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            Paystack Payment Settings
        </CardTitle>
        <CardDescription>
          Enable or disable Paystack and manage API keys.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="paystack-toggle" className="text-base font-medium">
              Enable Paystack
            </Label>
            <p className="text-sm text-muted-foreground">
              Allow users to pay with Paystack.
            </p>
          </div>
          <Switch
            id="paystack-toggle"
            checked={paystackEnabled}
            onCheckedChange={setPaystackEnabled}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="public-key">Public Key</Label>
          <Input
            id="public-key"
            type="text"
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            placeholder="pk_test_..."
            disabled={loading}
          />
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {paystackEnabled ? 'Paystack is enabled.' : 'Paystack is disabled.'}
          </AlertDescription>
        </Alert>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Button
            variant="outline"
            onClick={loadPaystackSettings}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            onClick={handleSaveSettings}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
