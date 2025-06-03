
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Key, Eye, EyeOff, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';

interface SunoApiKeyFormProps {
  onKeyUpdated: () => void;
}

export const SunoApiKeyForm = ({ onKeyUpdated }: SunoApiKeyFormProps) => {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);

  const validateApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    setIsValidating(true);
    setValidationResult(null);
    
    try {
      console.log('Validating Suno API key...');
      
      // Test the API key by making a simple request to Suno API
      const testResponse = await fetch('https://apibox.erweima.ai/api/v1/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'test validation',
          customMode: false,
          instrumental: true,
          model: 'V3_5'
        })
      });

      const responseData = await testResponse.json();
      console.log('Validation response:', responseData);

      let isValid = false;
      let message = '';

      if (testResponse.ok && responseData.code === 200) {
        isValid = true;
        message = 'API key is valid and working correctly';
        toast.success('✅ API key validated successfully!');
      } else if (responseData.code === 429) {
        // Rate limit or insufficient credits - but key is valid
        isValid = true;
        message = 'API key is valid but account has insufficient credits';
        toast.warning('⚠️ API key is valid but needs more credits');
      } else if (testResponse.status === 401) {
        isValid = false;
        message = 'API key is invalid or expired';
        toast.error('❌ Invalid API key');
      } else {
        isValid = false;
        message = responseData.msg || 'API key validation failed';
        toast.error('❌ Validation failed: ' + message);
      }

      setValidationResult({ isValid, message });

      if (isValid) {
        // Update environment variable via edge function
        try {
          const { data, error } = await supabase.functions.invoke('update-suno-key', {
            body: { apiKey: apiKey.trim() }
          });

          if (error) {
            console.error('Error updating environment:', error);
            toast.warning('API key is valid but failed to update environment');
          } else if (data?.success) {
            toast.success('API key validated and environment updated!');
            onKeyUpdated();
          }
        } catch (envError) {
          console.error('Environment update error:', envError);
          toast.warning('API key is valid but environment update may have failed');
        }
      }
      
    } catch (error: any) {
      console.error('Validation error:', error);
      setValidationResult({
        isValid: false,
        message: 'Network error or API unavailable'
      });
      toast.error('Validation failed: ' + error.message);
    } finally {
      setIsValidating(false);
    }
  };

  const clearForm = () => {
    setApiKey('');
    setValidationResult(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Suno API Key Configuration
          </CardTitle>
          <CardDescription>
            Enter and validate your Suno AI API key for music generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">API Key</label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                placeholder="Enter your Suno API key (32-character string)"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setValidationResult(null); // Clear previous validation
                }}
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

          {/* Validation Result */}
          {validationResult && (
            <div className={`p-3 rounded-lg border ${
              validationResult.isValid 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center gap-2">
                {validationResult.isValid ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm font-medium">
                  {validationResult.isValid ? 'Validation Successful' : 'Validation Failed'}
                </span>
              </div>
              <p className="text-sm mt-1">{validationResult.message}</p>
            </div>
          )}
          
          <div className="flex gap-4">
            <Button 
              onClick={validateApiKey} 
              disabled={isValidating || !apiKey.trim()}
              className="flex items-center gap-2"
            >
              {isValidating ? 'Validating...' : 'Validate & Save API Key'}
            </Button>
            
            <Button 
              type="button" 
              variant="outline"
              onClick={clearForm}
              disabled={isValidating}
            >
              Clear
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            <p>• API key should be a 32-character alphanumeric string</p>
            <p>• Get your API key from the Suno AI platform</p>
            <p>• Ensure your Suno account has sufficient credits</p>
          </div>
        </CardContent>
      </Card>

      <div className="p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> After successful validation, the API key will be securely stored 
          in your Supabase environment variables for use by the music generation system.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => window.open('https://supabase.com/dashboard/project/bswfiynuvjvoaoyfdrso/settings/functions', '_blank')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          View Supabase Environment Variables
        </Button>
      </div>
    </div>
  );
};
