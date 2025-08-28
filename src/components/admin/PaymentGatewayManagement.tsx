import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface PaymentGateway {
  id: number;
  name: string;
  enabled: boolean;
  public_key: string | null;
  secret_key: string | null;
}

const PaymentGatewayManagement: React.FC = () => {
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGateways();
  }, []);

  const fetchGateways = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_payment_gateways');
      if (error) throw error;
      setGateways(data);
    } catch (error: any) {
      toast.error('Failed to fetch payment gateways', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGatewayChange = (id: number, field: keyof PaymentGateway, value: any) => {
    setGateways(gateways.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const gateway of gateways) {
        const { error } = await supabase.rpc('update_payment_gateway', {
          gateway_id: gateway.id,
          is_enabled: gateway.enabled,
          new_public_key: gateway.public_key,
          new_secret_key: gateway.secret_key,
        });

        if (error) {
          throw new Error(`Failed to update ${gateway.name}: ${error.message}`);
        }
      }
      toast.success('Payment gateway settings saved successfully.');
    } catch (error: any) {
      toast.error('Failed to save settings', { description: error.message });
    } finally {
      setSaving(false);
      fetchGateways(); // Refresh data after saving
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Gateway Management</CardTitle>
        <CardDescription>Configure and manage payment gateways like Stripe and Paystack.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {gateways.map((gateway) => (
          <div key={gateway.id} className="border p-4 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold capitalize">{gateway.name}</h3>
              <Switch
                checked={gateway.enabled}
                onCheckedChange={(checked) => handleGatewayChange(gateway.id, 'enabled', checked)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`public-key-${gateway.id}`}>Public Key</Label>
              <Input
                id={`public-key-${gateway.id}`}
                placeholder={`Enter ${gateway.name} public key`}
                value={gateway.public_key || ''}
                onChange={(e) => handleGatewayChange(gateway.id, 'public_key', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`secret-key-${gateway.id}`}>Secret Key</Label>
              <Input
                id={`secret-key-${gateway.id}`}
                type="password"
                placeholder={`Enter ${gateway.name} secret key`}
                value={gateway.secret_key || ''}
                onChange={(e) => handleGatewayChange(gateway.id, 'secret_key', e.target.value)}
              />
            </div>
          </div>
        ))}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PaymentGatewayManagement;
