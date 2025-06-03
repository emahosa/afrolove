
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Key, Eye, EyeOff, ExternalLink, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

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
    hasCredits?: boolean;
  } | null>(null);

  const validateApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    // Basic format validation
    if (apiKey.length < 20 || apiKey.length > 50) {
      toast.error('API key format appears invalid (expected 20-50 characters)');
      return;
    }

    setIsValidating(true);
    setValidationResult(null);
    
    try {
      console.log('Starting API key validation...');
      console.log('API key length:', apiKey.length);
      
      const { data, error } = await supabase.functions.invoke('update-suno-key', {
        body: { apiKey: apiKey.trim() }
      });

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        const errorMessage = error.message || 'Failed to validate API key';
        setValidationResult({
          isValid: false,
          message: errorMessage
        });
        toast.error('❌ ' + errorMessage);
        return;
      }

      // Handle successful response
      if (data?.success) {
        console.log('Validation successful:', data);
        setValidationResult({
          isValid: true,
          message: data.message || 'API key validated successfully',
          hasCredits: data.hasCredits !== false
        });
        
        if (data.hasCredits !== false) {
          toast.success('✅ API key validated and ready to use!');
        } else {
          toast.warning('⚠️ API key is valid but needs more credits');
        }
        
        onKeyUpdated();
      } else {
        console.error('Validation failed:', data);
        const errorMessage = data?.error || 'API key validation failed';
        setValidationResult({
          isValid: false,
          message: errorMessage
        });
        toast.error('❌ ' + errorMessage);
      }
      
    } catch (error: any) {
      console.error('Critical validation error:', error);
      const errorMessage = 'Network error or API unavailable';
      setValidationResult({
        isValid: false,
        message: errorMessage
      });
      toast.error('❌ ' + errorMessage);
    } finally {
      console.log('Validation process completed');
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
                placeholder="Enter your Suno API key (20-50 characters)"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setValidationResult(null);
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

          {/* Validation Status */}
          {(isValidating || validationResult) && (
            <div className={`p-3 rounded-lg border ${
              isValidating 
                ? 'bg-blue-50 border-blue-200'
                : validationResult?.isValid 
                  ? validationResult.hasCredits
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-orange-50 border-orange-200 text-orange-800'
                  : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center gap-2">
                {isValidating ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                ) : validationResult?.isValid ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm font-medium">
                  {isValidating 
                    ? 'Validating API Key...' 
                    : validationResult?.isValid 
                      ? 'API Key Valid' 
                      : 'Validation Failed'
                  }
                </span>
              </div>
              {!isValidating && validationResult && (
                <>
                  <p className="text-sm mt-1">{validationResult.message}</p>
                  {validationResult.isValid && !validationResult.hasCredits && (
                    <p className="text-xs mt-2 text-orange-600">
                      ⚠️ Add credits to your Suno account to enable music generation
                    </p>
                  )}
                </>
              )}
            </div>
          )}
          
          <div className="flex gap-4">
            <Button 
              onClick={validateApiKey} 
              disabled={isValidating || !apiKey.trim()}
              className="flex items-center gap-2"
            >
              {isValidating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
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

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• API key should be 20-50 characters long</p>
            <p>• Get your API key from the Suno AI platform</p>
            <p>• Ensure your Suno account has sufficient credits</p>
            <p>• Keys are securely stored in environment variables</p>
          </div>
        </CardContent>
      </Card>

      <div className="p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Security:</strong> API keys are stored securely in Supabase environment 
          variables following industry best practices. Never share your API key or commit it to source control.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => window.open('https://supabase.com/dashboard/project/bswfiynuvjvoaoyfdrso/settings/functions', '_blank')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          View Environment Variables
        </Button>
      </div>
    </div>
  );
};
