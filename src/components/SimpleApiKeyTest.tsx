
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const SimpleApiKeyTest = () => {
  const [apiKey, setApiKey] = useState('7fc761e1476332e37664a3ef9be8b50c');
  const [isLoading, setIsLoading] = useState(false);

  const testApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Testing API key:', apiKey);
      
      const { data, error } = await supabase.functions.invoke('update-api-key', {
        body: { apiKey: apiKey.trim() }
      });

      console.log('Response:', { data, error });

      if (error) {
        toast.error('Test failed: ' + error.message);
      } else if (data?.success) {
        toast.success('✅ API key is valid!');
      } else {
        toast.error('❌ API key test failed: ' + (data?.error || 'Unknown error'));
      }
    } catch (err: any) {
      console.error('Error testing API key:', err);
      toast.error('Error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Test Suno API Key</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="text"
          placeholder="Enter your Suno API key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="font-mono text-sm"
        />
        <Button 
          onClick={testApiKey} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Testing...' : 'Test API Key'}
        </Button>
      </CardContent>
    </Card>
  );
};
