
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Key, Eye, EyeOff, ExternalLink } from 'lucide-react';

interface SunoApiKeyFormProps {
  onKeyUpdated: () => void;
}

export const SunoApiKeyForm = ({ onKeyUpdated }: SunoApiKeyFormProps) => {
  const [apiKey, setApiKey] = useState('7fc761e1476332e37664a3ef9be8b50c');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const validateApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('update-api-key', {
        body: {
          keyName: 'SUNO_API_KEY',
          newValue: apiKey.trim()
        }
      });

      if (error) {
        console.error('Validation error:', error);
        toast.error('Validation failed: ' + error.message);
        return;
      }

      if (data?.success) {
        toast.success('✅ API key validated successfully!');
        onKeyUpdated();
      } else {
        toast.error('Validation failed: ' + (data?.error || 'Unknown error'));
      }
      
    } catch (error: any) {
      console.error('Error validating API key:', error);
      toast.error('Failed to validate API key: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Update Suno API Key
          </CardTitle>
          <CardDescription>
            Enter your Suno AI API key to validate it
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">API Key</label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                placeholder="Enter your Suno API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10 font-mono text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="flex gap-4">
            <Button 
              onClick={validateApiKey} 
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting ? 'Validating...' : 'Validate API Key'}
            </Button>
            
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setApiKey('')}
              disabled={isSubmitting}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> After validation, you'll need to manually update the SUNO_API_KEY secret in your Supabase project settings.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => window.open('https://supabase.com/dashboard/project/bswfiynuvjvoaoyfdrso/settings/functions', '_blank')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Open Supabase Secrets
        </Button>
      </div>
    </div>
  );
};
