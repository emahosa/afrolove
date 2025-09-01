
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaymentGatewaySettings {
  enabled: boolean;
  mode: 'test' | 'live';
  activeGateway: 'stripe' | 'paystack';
  stripe: {
    test: { publicKey: string; secretKey: string };
    live: { publicKey: string; secretKey: string };
  };
  paystack: {
    test: { publicKey: string; secretKey: string };
    live: { publicKey: string; secretKey: string };
  };
}

const PaymentGatewayManagement = () => {
  const [settings, setSettings] = useState<PaymentGatewaySettings>({
    enabled: false,
    mode: 'test',
    activeGateway: 'stripe',
    stripe: {
      test: { publicKey: '', secretKey: '' },
      live: { publicKey: '', secretKey: '' }
    },
    paystack: {
      test: { publicKey: '', secretKey: '' },
      live: { publicKey: '', secretKey: '' }
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'payment_gateway_settings')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading payment settings:', error);
        toast.error('Failed to load payment settings');
        return;
      }

      if (data?.value) {
        try {
          let loadedSettings: PaymentGatewaySettings;
          if (typeof data.value === 'string') {
            loadedSettings = JSON.parse(data.value);
          } else {
            loadedSettings = data.value as PaymentGatewaySettings;
          }
          
          if (loadedSettings && typeof loadedSettings === 'object' && 
              'enabled' in loadedSettings && 'mode' in loadedSettings && 
              'activeGateway' in loadedSettings) {
            setSettings(loadedSettings);
          }
        } catch (parseError) {
          console.error('Error parsing settings:', parseError);
          toast.error('Failed to parse payment settings');
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'payment_gateway_settings',
          value: JSON.stringify(settings),
          category: 'payment',
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) {
        console.error('Error saving settings:', error);
        throw error;
      }

      toast.success('Payment settings saved successfully');
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const updateGatewaySettings = (gateway: 'stripe' | 'paystack', mode: 'test' | 'live', field: 'publicKey' | 'secretKey', value: string) => {
    setSettings(prev => ({
      ...prev,
      [gateway]: {
        ...prev[gateway],
        [mode]: {
          ...prev[gateway][mode],
          [field]: value
        }
      }
    }));
  };

  if (loading) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6">
          <div className="text-center text-gray-400">Loading payment settings...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Payment Gateway Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Global Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={settings.enabled}
                onCheckedChange={(enabled) => setSettings(prev => ({ ...prev, enabled }))}
              />
              <Label className="text-white">Enable Payment Processing</Label>
            </div>
            
            <div className="space-y-2">
              <Label className="text-white">Mode</Label>
              <Select 
                value={settings.mode} 
                onValueChange={(mode: 'test' | 'live') => setSettings(prev => ({ ...prev, mode }))}
              >
                <SelectTrigger className="bg-black/20 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">Test Mode</SelectItem>
                  <SelectItem value="live">Live Mode</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-white">Active Gateway</Label>
              <Select 
                value={settings.activeGateway} 
                onValueChange={(gateway: 'stripe' | 'paystack') => setSettings(prev => ({ ...prev, activeGateway: gateway }))}
              >
                <SelectTrigger className="bg-black/20 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="paystack">Paystack</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Gateway Configuration */}
          <Tabs defaultValue="stripe" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-black/30">
              <TabsTrigger value="stripe" className="data-[state=active]:bg-dark-purple">Stripe</TabsTrigger>
              <TabsTrigger value="paystack" className="data-[state=active]:bg-dark-purple">Paystack</TabsTrigger>
            </TabsList>
            
            <TabsContent value="stripe" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-black/20 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">Test Mode</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-white">Publishable Key</Label>
                      <Input
                        type="text"
                        value={settings.stripe.test.publicKey}
                        onChange={(e) => updateGatewaySettings('stripe', 'test', 'publicKey', e.target.value)}
                        placeholder="pk_test_..."
                        className="bg-black/30 border-white/20 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Secret Key</Label>
                      <Input
                        type="password"
                        value={settings.stripe.test.secretKey}
                        onChange={(e) => updateGatewaySettings('stripe', 'test', 'secretKey', e.target.value)}
                        placeholder="sk_test_..."
                        className="bg-black/30 border-white/20 text-white"
                      />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-black/20 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">Live Mode</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-white">Publishable Key</Label>
                      <Input
                        type="text"
                        value={settings.stripe.live.publicKey}
                        onChange={(e) => updateGatewaySettings('stripe', 'live', 'publicKey', e.target.value)}
                        placeholder="pk_live_..."
                        className="bg-black/30 border-white/20 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Secret Key</Label>
                      <Input
                        type="password"
                        value={settings.stripe.live.secretKey}
                        onChange={(e) => updateGatewaySettings('stripe', 'live', 'secretKey', e.target.value)}
                        placeholder="sk_live_..."
                        className="bg-black/30 border-white/20 text-white"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="paystack" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-black/20 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">Test Mode</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-white">Public Key</Label>
                      <Input
                        type="text"
                        value={settings.paystack.test.publicKey}
                        onChange={(e) => updateGatewaySettings('paystack', 'test', 'publicKey', e.target.value)}
                        placeholder="pk_test_..."
                        className="bg-black/30 border-white/20 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Secret Key</Label>
                      <Input
                        type="password"
                        value={settings.paystack.test.secretKey}
                        onChange={(e) => updateGatewaySettings('paystack', 'test', 'secretKey', e.target.value)}
                        placeholder="sk_test_..."
                        className="bg-black/30 border-white/20 text-white"
                      />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-black/20 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">Live Mode</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-white">Public Key</Label>
                      <Input
                        type="text"
                        value={settings.paystack.live.publicKey}
                        onChange={(e) => updateGatewaySettings('paystack', 'live', 'publicKey', e.target.value)}
                        placeholder="pk_live_..."
                        className="bg-black/30 border-white/20 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Secret Key</Label>
                      <Input
                        type="password"
                        value={settings.paystack.live.secretKey}
                        onChange={(e) => updateGatewaySettings('paystack', 'live', 'secretKey', e.target.value)}
                        placeholder="sk_live_..."
                        className="bg-black/30 border-white/20 text-white"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button 
              onClick={saveSettings} 
              disabled={saving}
              className="bg-dark-purple hover:bg-opacity-90"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentGatewayManagement;
