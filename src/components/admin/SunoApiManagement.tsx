
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Key, RefreshCw, Music } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useSunoGeneration } from '@/hooks/use-suno-generation';
import { supabase } from '@/integrations/supabase/client';
import { SunoApiKeyForm } from './SunoApiKeyForm';

export const SunoApiManagement = () => {
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'checking' | 'valid' | 'invalid' | 'missing'>('checking');
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  
  const { generateSong, isGenerating, generationStatus } = useSunoGeneration();

  const checkApiKeyStatus = async () => {
    setIsChecking(true);
    setKeyStatus('checking');

    try {
      console.log('Checking Suno API key status...');
      
      const { data, error } = await supabase.functions.invoke('suno-status', {
        body: { taskId: 'test' }
      });

      console.log('API key check response:', { data, error });

      if (error) {
        console.error('API key check error:', error);
        if (error.message?.includes('SUNO_API_KEY not configured')) {
          setKeyStatus('missing');
          toast.error('Suno API key is not configured');
        } else {
          setKeyStatus('invalid');
          toast.error('API key check failed: ' + error.message);
        }
      } else if (data) {
        if (data.code === 200 || data.msg === 'success') {
          setKeyStatus('valid');
          toast.success('Suno API key is valid and working');
        } else {
          setKeyStatus('invalid');
          toast.error('API key appears to be invalid');
        }
      } else {
        setKeyStatus('invalid');
        toast.error('Unexpected response from API key check');
      }

      setLastChecked(new Date().toLocaleString());
    } catch (error) {
      console.error('Error checking API key:', error);
      setKeyStatus('invalid');
      toast.error('Failed to check API key status');
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

  const handleTestGeneration = async () => {
    if (keyStatus !== 'valid') {
      toast.error('Please configure a valid API key first.');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to test generation.');
      return;
    }

    try {
      console.log('Starting test generation...');
      await generateSong({
        prompt: 'Test generation for API verification',
        style: 'Pop',
        title: 'API Test Song',
        instrumental: true,
        customMode: false,
        model: 'V3_5',
        isAdminTest: true
      });
    } catch (error: any) {
      console.error('Test generation error:', error);
      toast.error('Failed to test generation: ' + error.message);
    }
  };

  const handleKeyUpdated = () => {
    // Refresh the API key status after update
    checkApiKeyStatus();
  };

  // Show generation status updates
  useEffect(() => {
    if (generationStatus) {
      console.log('Generation status update:', generationStatus);
      
      if (generationStatus.status === 'SUCCESS') {
        toast.success('🎵 Test generation completed successfully!');
      } else if (generationStatus.status === 'FAIL') {
        toast.error('Test generation failed');
      } else if (generationStatus.status === 'TEXT_SUCCESS') {
        toast.info('Test: Lyrics generated, creating audio...');
      }
    }
  }, [generationStatus]);

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
                  disabled={isGenerating}
                >
                  <Music className="h-4 w-4 mr-2" />
                  {isGenerating ? 'Generating...' : 'Test Generation'}
                </Button>
              )}
            </div>

            {/* Show current generation status */}
            {generationStatus && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium">Generation Status:</p>
                <p className="text-sm text-muted-foreground">
                  Task ID: {generationStatus.task_id}
                </p>
                <p className="text-sm text-muted-foreground">
                  Status: {generationStatus.status}
                </p>
                {generationStatus.audio_url && (
                  <p className="text-sm text-green-600">
                    ✅ Audio generated successfully!
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>API Usage & Features</CardTitle>
            <CardDescription>
              Information about Suno AI API capabilities and usage
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
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Key Update Form */}
      <SunoApiKeyForm onKeyUpdated={handleKeyUpdated} />
    </div>
  );
};
