
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Key, RefreshCw, Music } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const SunoApiManagement = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'checking' | 'valid' | 'invalid' | 'missing'>('checking');
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const checkApiKeyStatus = async () => {
    setIsChecking(true);
    setKeyStatus('checking');

    try {
      // Make a direct GET request to the edge function with taskId as query parameter
      const response = await fetch(`https://bswfiynuvjvoaoyfdrso.supabase.co/functions/v1/suno-status?taskId=test`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzd2ZpeW51dmp2b2FveWZkcnNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4Mjk2NTcsImV4cCI6MjA2MTQwNTY1N30.Z-tEs9Z2p5XmcivOQjV8oc5JWWSSKtgJucvmqA2Q6-c`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzd2ZpeW51dmp2b2FveWZkcnNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4Mjk2NTcsImV4cCI6MjA2MTQwNTY1N30.Z-tEs9Z2p5XmcivOQjV8oc5JWWSSKtgJucvmqA2Q6-c',
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        setKeyStatus('valid');
        toast.success('Suno API key is valid and working');
      } else {
        const errorData = await response.json();
        if (errorData.error?.includes('SUNO_API_KEY not configured')) {
          setKeyStatus('missing');
        } else {
          setKeyStatus('invalid');
        }
      }

      setLastChecked(new Date().toLocaleString());
    } catch (error) {
      console.error('Error checking API key:', error);
      setKeyStatus('invalid');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkApiKeyStatus();
  }, []);

  const getStatusBadge = () => {
    switch (keyStatus) {
      case 'checking':
        return <Badge variant="secondary">Checking...</Badge>;
      case 'valid':
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case 'invalid':
        return <Badge variant="destructive">Invalid</Badge>;
      case 'missing':
        return <Badge variant="outline">Not Configured</Badge>;
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
      case 'invalid':
      case 'missing':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Key className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusMessage = () => {
    switch (keyStatus) {
      case 'checking':
        return 'Verifying API key configuration...';
      case 'valid':
        return 'API key is properly configured and working.';
      case 'invalid':
        return 'API key is configured but appears to be invalid or expired.';
      case 'missing':
        return 'No API key configured. Please add your Suno API key to enable music generation.';
      default:
        return 'Unable to determine API key status.';
    }
  };

  const handleAddApiKey = () => {
    toast.info('Use the secret form below to securely add your Suno API key.');
  };

  const handleTestGeneration = async () => {
    if (keyStatus !== 'valid') {
      toast.error('Please configure a valid API key first.');
      return;
    }

    try {
      setIsChecking(true);
      const { data, error } = await supabase.functions.invoke('suno-generate', {
        body: {
          prompt: 'Test generation',
          style: 'Pop',
          title: 'API Test',
          instrumental: true,
          customMode: false,
          model: 'V3_5'
        }
      });

      if (error) {
        toast.error('Test generation failed: ' + error.message);
      } else {
        toast.success('Test generation started successfully!');
      }
    } catch (error) {
      toast.error('Failed to test generation');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Suno AI API Management</h2>
        <p className="text-muted-foreground">Configure and manage your Suno AI API integration for music generation</p>
      </div>

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
              {getStatusMessage()}
            </p>

            {lastChecked && (
              <p className="text-xs text-muted-foreground">
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
                Refresh Status
              </Button>

              {keyStatus === 'valid' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleTestGeneration}
                  disabled={isChecking}
                >
                  <Music className="h-4 w-4 mr-2" />
                  Test Generation
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* API Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Configuration
            </CardTitle>
            <CardDescription>
              Manage your Suno API key securely
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Configure API Key</h4>
              <p className="text-sm text-muted-foreground">
                Your API key is stored securely in Supabase secrets. Click the button below to add or update your key.
              </p>
            </div>

            <Button 
              onClick={handleAddApiKey}
              className="w-full"
              variant={keyStatus === 'missing' ? 'default' : 'outline'}
            >
              <Key className="h-4 w-4 mr-2" />
              {keyStatus === 'missing' ? 'Add API Key' : 'Update API Key'}
            </Button>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Get your API key from the Suno AI dashboard</p>
              <p>• Keys are encrypted and stored securely</p>
              <p>• Never share your API key publicly</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>API Usage & Features</CardTitle>
          <CardDescription>
            Information about Suno AI API capabilities and usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
