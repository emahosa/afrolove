import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Key, RefreshCw, Music, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useSunoGeneration } from '@/hooks/use-suno-generation';
import { supabase } from '@/integrations/supabase/client';
import { SunoApiKeyForm } from './SunoApiKeyForm';

export const SunoApiManagement = () => {
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'checking' | 'valid' | 'invalid' | 'missing' | 'no_credits' | 'error'>('checking');
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  const { generateSong, isGenerating } = useSunoGeneration();

  const checkApiKeyStatus = async () => {
    setIsChecking(true);
    setKeyStatus('checking');
    setStatusMessage('Checking API key configuration...');

    try {
      console.log('Performing comprehensive API key status check...');
      
      // First check if we can call the status function
      const { data, error } = await supabase.functions.invoke('suno-status', {
        body: { taskId: 'status-check' }
      });

      console.log('Status check response:', { data, error });

      if (error) {
        console.error('Status check error:', error);
        
        if (error.message?.includes('SUNO_API_KEY not configured')) {
          setKeyStatus('missing');
          setStatusMessage('No Suno API key configured in environment');
          toast.error('Suno API key is not configured');
        } else if (error.message?.includes('invalid') || error.message?.includes('unauthorized')) {
          setKeyStatus('invalid');
          setStatusMessage('API key appears to be invalid or expired');
          toast.error('API key validation failed');
        } else {
          setKeyStatus('error');
          setStatusMessage(`Status check failed: ${error.message}`);
          toast.error('Unable to check API key status');
        }
      } else if (data) {
        // Analyze the response to determine status
        if (data.code === 200) {
          setKeyStatus('valid');
          setStatusMessage('API key is valid and working correctly');
          toast.success('Suno API key is configured and working');
        } else if (data.code === 429 || data.msg?.includes('credit')) {
          setKeyStatus('no_credits');
          setStatusMessage('API key is valid but Suno account has insufficient credits');
          toast.warning('⚠️ Suno API key valid but needs more credits');
        } else if (data.code === 401 || data.msg?.includes('unauthorized')) {
          setKeyStatus('invalid');
          setStatusMessage('API key is invalid or expired');
          toast.error('Invalid API key detected');
        } else {
          setKeyStatus('error');
          setStatusMessage(`Unexpected response: ${data.msg || 'Unknown status'}`);
          toast.warning('Unexpected API response received');
        }
      } else {
        setKeyStatus('error');
        setStatusMessage('No response received from API check');
        toast.error('Failed to get API status response');
      }

      setLastChecked(new Date().toLocaleString());
    } catch (error) {
      console.error('Critical error in status check:', error);
      setKeyStatus('error');
      setStatusMessage(`Critical error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error('Failed to check API key status');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Initial status check when component mounts
    checkApiKeyStatus();
  }, []);

  const getStatusBadge = () => {
    switch (keyStatus) {
      case 'checking':
        return <Badge variant="secondary" className="animate-pulse">Checking...</Badge>;
      case 'valid':
        return <Badge variant="default" className="bg-green-500">Active & Working</Badge>;
      case 'invalid':
        return <Badge variant="destructive">Invalid/Expired</Badge>;
      case 'missing':
        return <Badge variant="outline">Not Configured</Badge>;
      case 'no_credits':
        return <Badge variant="destructive" className="bg-orange-500">Valid - No Credits</Badge>;
      case 'error':
        return <Badge variant="destructive">Check Failed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getStatusIcon = () => {
    switch (keyStatus) {
      case 'checking':
        return <RefreshCw className="h-5 w-5 animate-spin text-gray-500" />;
      case 'valid':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'no_credits':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'invalid':
      case 'missing':
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Key className="h-5 w-5 text-gray-500" />;
    }
  };

  const handleTestGeneration = async () => {
    if (keyStatus !== 'valid') {
      toast.error('Please configure a valid API key first');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to test generation');
      return;
    }

    try {
      console.log('Starting admin test generation...');
      await generateSong({
        prompt: 'Test generation for API verification - short instrumental piece',
        style: 'Ambient',
        title: 'API Test Track',
        instrumental: true,
        customMode: false,
        model: 'V3_5'
      });
    } catch (error: any) {
      console.error('Test generation error:', error);
      toast.error('Test generation failed: ' + error.message);
    }
  };

  const handleKeyUpdated = () => {
    // Refresh the API key status after update
    toast.info('Rechecking API key status...');
    setTimeout(() => {
      checkApiKeyStatus();
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Suno AI API Management</h2>
        <p className="text-muted-foreground">Configure and manage your Suno AI API integration for music generation</p>
      </div>

      {/* Critical Status Alert */}
      {keyStatus === 'no_credits' && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <h4 className="font-medium text-orange-900">Suno Account Credits Exhausted</h4>
                <p className="text-sm text-orange-700 mt-1">
                  Your Suno AI account has run out of credits. Users will not be able to generate songs until you top up your Suno account.
                </p>
                <a 
                  href="https://suno.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-orange-600 underline hover:text-orange-800 mt-2 inline-block"
                >
                  Visit Suno Dashboard to Add Credits →
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* API Key Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon()}
              API Key Status
            </CardTitle>
            <CardDescription>
              Current status of your Suno API key configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Status:</span>
              {getStatusBadge()}
            </div>
            
            <p className="text-sm text-muted-foreground">
              {statusMessage}
            </p>

            {lastChecked && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last checked: {lastChecked}
              </p>
            )}

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={checkApiKeyStatus}
                disabled={isChecking}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
                {isChecking ? 'Checking...' : 'Refresh Status'}
              </Button>

              {keyStatus === 'valid' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleTestGeneration}
                  disabled={isGenerating}
                >
                  <Music className="h-4 w-4 mr-2" />
                  {isGenerating ? 'Testing...' : 'Test Generation'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usage Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>API Usage & Features</CardTitle>
            <CardDescription>
              Information about Suno AI API capabilities and requirements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <h4 className="font-medium mb-2">Supported Models</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• V3.5 - Stable, good structure (max 3000 chars)</li>
                  <li>• V4 - High-quality audio (max 3000 chars)</li>
                  <li>• V4.5 - Most advanced (max 5000 chars)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Generation Modes</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Prompt Mode - Short creative descriptions</li>
                  <li>• Lyric Input Mode - Full song lyrics</li>
                  <li>• Instrumental tracks available</li>
                  <li>• Custom styles and genres</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-orange-600">💡 Credit Management</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Each generation uses Suno account credits</li>
                  <li>• Monitor credit usage in your Suno dashboard</li>
                  <li>• Top up credits as needed for continuous service</li>
                  <li>• Invalid keys or insufficient credits will block generation</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Key Configuration Form */}
      <SunoApiKeyForm onKeyUpdated={handleKeyUpdated} />
    </div>
  );
};
