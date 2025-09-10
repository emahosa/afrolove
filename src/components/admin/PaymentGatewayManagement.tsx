import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Save, Loader2, TestTube, Zap } from 'lucide-react';

interface ApiKeys {
  publicKey: string;
  secretKey: string;
}

interface GatewayConfig {
  test: ApiKeys;
  live: ApiKeys;
}

interface PaymentGatewaySettings {
  enabled: boolean;
  mode: 'test' | 'live';
  activeGateway: 'stripe' | 'paystack';
  stripe: GatewayConfig;
  paystack: GatewayConfig;
  usdToNgnRate: number;
}

const defaultSettings: PaymentGatewaySettings = {
  enabled: false,
  mode: 'test',
  activeGateway: 'stripe',
  stripe: {
    test: { publicKey: '', secretKey: '' },
    live: { publicKey: '', secretKey: '' },
  },
  paystack: {
    test: { publicKey: '', secretKey: '' },
    live: { publicKey: '', secretKey: '' },
  },
  usdToNgnRate: 0,
};

export const PaymentGatewayManagement = () => {
  const [settings, setSettings] = useState<PaymentGatewaySettings>(defaultSettings);
  const [initialSettings, setInitialSettings] = useState<PaymentGatewaySettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'payment_gateway_settings')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.value) {
        let dbValue: Partial<PaymentGatewaySettings>;
        if (typeof data.value === 'string') {
          console.warn('data.value was stringified JSON, parsing now.');
          dbValue = JSON.parse(data.value);
        } else {
          dbValue = data.value as Partial<PaymentGatewaySettings>;
        }

        const mergedSettings: PaymentGatewaySettings = {
          ...defaultSettings,
          ...dbValue,
          stripe: {
            ...defaultSettings.stripe,
            ...dbValue.stripe,
            test: { ...defaultSettings.stripe.test, ...dbValue.stripe?.test },
            live: { ...defaultSettings.stripe.live, ...dbValue.stripe?.live },
          },
          paystack: {
            ...defaultSettings.paystack,
            ...dbValue.paystack,
            test: { ...defaultSettings.paystack.test, ...dbValue.paystack?.test },
            live: { ...defaultSettings.paystack.live, ...dbValue.paystack?.live },
          },
        };
        setSettings(mergedSettings);
        setInitialSettings(mergedSettings);
      } else {
        setSettings(defaultSettings);
        setInitialSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error loading payment gateway settings:', error);
      toast.error('Failed to load payment gateway settings');
    } finally {
      setLoading(false);
      setIsDirty(false);
    }
  };

  const persistSettings = async (settingsToSave: PaymentGatewaySettings) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('system_settings')
        .select('id')
        .eq('key', 'payment_gateway_settings')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      const { error: upsertError } = await supabase.from('system_settings').upsert({
        id: data?.id,
        key: 'payment_gateway_settings',
        value: settingsToSave as any,
        category: 'payment',
        description: 'Configuration for payment gateways (Stripe, Paystack)',
        updated_by: user.id,
      });

      if (upsertError) throw upsertError;

      setInitialSettings(settingsToSave);
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings.');
      return false;
    }
  };

  const handleSaveAllSettings = async () => {
    setSaving(true);
    const success = await persistSettings(settings);
    if (success) {
      toast.success('All payment gateway settings saved.');
      setIsDirty(false);
    }
    setSaving(false);
  };

  const handleQuickSave = async <K extends keyof PaymentGatewaySettings>(
    key: K,
    value: PaymentGatewaySettings[K],
    toastMessage: string
  ) => {
    const originalSettings = { ...settings };
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    const success = await persistSettings(newSettings);

    if (success) {
      toast.success(toastMessage);
      setInitialSettings(newSettings);
    } else {
      setSettings(originalSettings); // Revert on failure
    }
  };

  const handleInputChange = (gateway: 'stripe' | 'paystack', mode: 'test' | 'live', field: 'publicKey' | 'secretKey', value: string) => {
    setSettings(prev => ({
      ...prev,
      [gateway]: {
        ...prev[gateway],
        [mode]: {
          ...prev[gateway][mode],
          [field]: value,
        },
      },
    }));
    setIsDirty(true);
  };

  const handleRateInputChange = (value: string) => {
    setSettings(prev => ({
      ...prev,
      usdToNgnRate: parseFloat(value) || 0,
    }));
    setIsDirty(true);
  };

  if (loading) {
    return <Card><CardHeader><CardTitle>Payment Gateway Settings</CardTitle><CardDescription>Loading...</CardDescription></CardHeader><CardContent className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CreditCard />Payment Gateway Management</CardTitle>
        <CardDescription>Configure and manage payment gateways, API keys, and operating mode.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label htmlFor="payment-enabled" className="text-base font-medium">Enable Payment Gateways</Label>
            <p className="text-sm text-muted-foreground">Master switch to enable or disable all payment processing.</p>
          </div>
          <Switch
            id="payment-enabled"
            checked={settings.enabled}
            onCheckedChange={(enabled) => handleQuickSave('enabled', enabled, `Payment gateways ${enabled ? 'enabled' : 'disabled'}.`)}
          />
        </div>

        {settings.enabled && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 p-4 border rounded-lg">
                <Label className="text-base font-medium">Active Gateway</Label>
                <RadioGroup
                  value={settings.activeGateway}
                  onValueChange={(v: 'stripe' | 'paystack') => handleQuickSave('activeGateway', v, `Active gateway set to ${v.charAt(0).toUpperCase() + v.slice(1)}.`)}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2"><RadioGroupItem value="stripe" id="stripe" /><Label htmlFor="stripe">Stripe</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="paystack" id="paystack" /><Label htmlFor="paystack">Paystack</Label></div>
                </RadioGroup>
              </div>
              <div className="space-y-4 p-4 border rounded-lg">
                <Label className="text-base font-medium">Operating Mode</Label>
                <RadioGroup
                  value={settings.mode}
                  onValueChange={(v: 'test' | 'live') => handleQuickSave('mode', v, `Operating mode set to ${v}.`)}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2"><RadioGroupItem value="test" id="test" /><Label htmlFor="test" className="flex items-center gap-2"><TestTube size={16}/>Test</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="live" id="live" /><Label htmlFor="live" className="flex items-center gap-2"><Zap size={16}/>Live</Label></div>
                </RadioGroup>
              </div>
            </div>

            <Tabs defaultValue="stripe" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="stripe">Stripe Keys</TabsTrigger>
                <TabsTrigger value="paystack">Paystack Keys</TabsTrigger>
              </TabsList>
              <TabsContent value="stripe" className="p-4 border rounded-lg mt-2">
                <h3 className="text-lg font-medium mb-4">Stripe API Keys</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-muted-foreground">Test Keys</h4>
                    <div className="space-y-2"><Label>Public Key</Label><Input type="text" placeholder="pk_test_..." value={settings.stripe.test.publicKey} onChange={(e) => handleInputChange('stripe', 'test', 'publicKey', e.target.value)} /></div>
                    <div className="space-y-2"><Label>Secret Key</Label><Input type="password" placeholder="sk_test_..." value={settings.stripe.test.secretKey} onChange={(e) => handleInputChange('stripe', 'test', 'secretKey', e.target.value)} /></div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-medium text-muted-foreground">Live Keys</h4>
                    <div className="space-y-2"><Label>Public Key</Label><Input type="text" placeholder="pk_live_..." value={settings.stripe.live.publicKey} onChange={(e) => handleInputChange('stripe', 'live', 'publicKey', e.target.value)} /></div>
                    <div className="space-y-2"><Label>Secret Key</Label><Input type="password" placeholder="sk_live_..." value={settings.stripe.live.secretKey} onChange={(e) => handleInputChange('stripe', 'live', 'secretKey', e.target.value)} /></div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="paystack" className="p-4 border rounded-lg mt-2 space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Paystack API Keys</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium text-muted-foreground">Test Keys</h4>
                      <div className="space-y-2"><Label>Public Key</Label><Input type="text" placeholder="pk_test_..." value={settings.paystack.test.publicKey} onChange={(e) => handleInputChange('paystack', 'test', 'publicKey', e.target.value)} /></div>
                      <div className="space-y-2"><Label>Secret Key</Label><Input type="password" placeholder="sk_test_..." value={settings.paystack.test.secretKey} onChange={(e) => handleInputChange('paystack', 'test', 'secretKey', e.target.value)} /></div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-medium text-muted-foreground">Live Keys</h4>
                      <div className="space-y-2"><Label>Public Key</Label><Input type="text" placeholder="pk_live_..." value={settings.paystack.live.publicKey} onChange={(e) => handleInputChange('paystack', 'live', 'publicKey', e.target.value)} /></div>
                      <div className="space-y-2"><Label>Secret Key</Label><Input type="password" placeholder="sk_live_..." value={settings.paystack.live.secretKey} onChange={(e) => handleInputChange('paystack', 'live', 'secretKey', e.target.value)} /></div>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-4">Currency Conversion</h3>
                  <div className="space-y-2">
                    <Label htmlFor="usdToNgnRate">USD to NGN Rate</Label>
                    <Input
                      id="usdToNgnRate"
                      type="number"
                      value={settings.usdToNgnRate}
                      onChange={(e) => handleRateInputChange(e.target.value)}
                      placeholder="e.g., 1500"
                    />
                    <p className="text-xs text-muted-foreground">
                      The conversion rate from USD to NGN. This will be used for Paystack transactions.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSaveAllSettings} disabled={!isDirty || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save API Keys
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
