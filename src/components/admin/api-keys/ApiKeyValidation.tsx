
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ApiKeyValidationProps {
  provider: string;
  apiKey: string;
  onValidationComplete: (isValid: boolean, message: string) => void;
}

export const ApiKeyValidation = ({ provider, apiKey, onValidationComplete }: ApiKeyValidationProps) => {
  const [isValidating, setIsValidating] = useState(false);
  const [lastValidated, setLastValidated] = useState<Date | null>(null);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid' | 'warning'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const validateKey = async () => {
    if (!apiKey.trim()) {
      toast.error('API key is required for validation');
      return;
    }

    setIsValidating(true);
    setValidationStatus('idle');
    setStatusMessage('Validating API key...');
    
    try {
      console.log('Validating API key via Supabase edge function...');
      
      // Use the Supabase edge function for validation
      const { data, error } = await supabase.functions.invoke('update-suno-key', {
        body: { apiKey: apiKey.trim() }
      });

      console.log('Validation response:', { data, error });

      let isValid = false;
      let message = '';
      let status: 'valid' | 'invalid' | 'warning' = 'invalid';

      if (error) {
        console.error('Validation error:', error);
        message = `Validation failed: ${error.message}`;
        status = 'invalid';
        toast.error('❌ Validation failed: ' + error.message);
      } else if (data?.success) {
        isValid = true;
        message = data.message || 'API key is valid and working correctly';
        status = data.hasCredits !== false ? 'valid' : 'warning';
        
        if (data.hasCredits !== false) {
          toast.success('✅ API key validated successfully!');
        } else {
          toast.warning('⚠️ API key valid but needs more credits');
        }
      } else {
        message = data?.error || 'API key validation failed';
        status = 'invalid';
        toast.error('❌ ' + message);
      }

      setValidationStatus(status);
      setStatusMessage(message);
      setLastValidated(new Date());
      onValidationComplete(isValid, message);
      
    } catch (error: any) {
      console.error('Critical validation error:', error);
      const errorMessage = 'Network error or API unavailable';
      setValidationStatus('invalid');
      setStatusMessage(errorMessage);
      toast.error('Validation failed: ' + errorMessage);
      onValidationComplete(false, errorMessage);
    } finally {
      setIsValidating(false);
    }
  };

  const getStatusBadge = () => {
    switch (validationStatus) {
      case 'valid':
        return <Badge variant="default" className="bg-green-500">Valid</Badge>;
      case 'warning':
        return <Badge variant="destructive" className="bg-orange-500">Valid - No Credits</Badge>;
      case 'invalid':
        return <Badge variant="destructive">Invalid</Badge>;
      default:
        return <Badge variant="outline">Not Validated</Badge>;
    }
  };

  const getStatusIcon = () => {
    switch (validationStatus) {
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'invalid':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          {getStatusIcon()}
          API Key Validation
        </CardTitle>
        <CardDescription>
          Verify that your {provider} API key is working correctly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">Status:</span>
          {getStatusBadge()}
        </div>

        {statusMessage && (
          <p className="text-sm text-muted-foreground">{statusMessage}</p>
        )}

        {lastValidated && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Last validated: {lastValidated.toLocaleString()}
          </p>
        )}

        <Button 
          variant="outline" 
          size="sm" 
          onClick={validateKey}
          disabled={isValidating}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
          {isValidating ? 'Validating...' : 'Validate API Key'}
        </Button>
      </CardContent>
    </Card>
  );
};
