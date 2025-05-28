
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Key, Save, Eye, EyeOff, Copy, ExternalLink } from 'lucide-react';

const formSchema = z.object({
  apiKey: z.string().min(10, {
    message: "API key must be at least 10 characters.",
  }),
});

interface SunoApiKeyFormProps {
  onKeyUpdated: () => void;
}

export const SunoApiKeyForm = ({ onKeyUpdated }: SunoApiKeyFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [validatedKey, setValidatedKey] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      apiKey: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('update-api-key', {
        body: {
          keyName: 'SUNO_API_KEY',
          newValue: values.apiKey.trim()
        }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        setValidatedKey(data.validatedKey);
        toast.success('✅ API key validated successfully!', {
          description: 'Now follow the instructions below to complete the update.',
          duration: 6000,
        });
      } else {
        toast.error('Validation failed: ' + (data.error || 'Unknown error'));
      }
      
    } catch (error: any) {
      console.error('Error validating API key:', error);
      toast.error('Failed to validate API key: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyKey = () => {
    if (validatedKey) {
      navigator.clipboard.writeText(validatedKey);
      toast.success('API key copied to clipboard');
    }
  };

  const openSupabaseSecrets = () => {
    window.open('https://supabase.com/dashboard/project/_/settings/functions', '_blank');
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
            Enter your new Suno AI API key to validate and update the configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Key</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="Enter your Suno API key"
                          type={showKey ? "text" : "password"}
                          className="pr-10"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowKey(!showKey)}
                        >
                          {showKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Your API key will be validated before manual update in Supabase
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex gap-4">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSubmitting ? 'Validating...' : 'Validate API Key'}
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    setValidatedKey(null);
                  }}
                  disabled={isSubmitting}
                >
                  Clear
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {validatedKey && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">✅ API Key Validated Successfully</CardTitle>
            <CardDescription className="text-green-700">
              Follow these steps to complete the API key update:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="font-medium text-green-800">Step 1: Copy the validated API key</p>
              <div className="flex items-center gap-2">
                <Input
                  value={validatedKey}
                  readOnly
                  className="bg-white font-mono text-sm"
                />
                <Button
                  onClick={copyKey}
                  size="sm"
                  variant="outline"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-medium text-green-800">Step 2: Update the secret in Supabase</p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-green-700 ml-4">
                <li>Go to your Supabase Dashboard</li>
                <li>Navigate to Settings → Edge Functions → Secrets</li>
                <li>Find the "SUNO_API_KEY" secret</li>
                <li>Update it with the validated key above</li>
                <li>Save the changes</li>
              </ol>
              <Button
                onClick={openSupabaseSecrets}
                size="sm"
                variant="outline"
                className="mt-2"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Supabase Secrets
              </Button>
            </div>

            <div className="space-y-2">
              <p className="font-medium text-green-800">Step 3: Verify the update</p>
              <p className="text-sm text-green-700">
                After updating the secret, use the "Refresh Status" button to verify the new key is working.
              </p>
              <Button
                onClick={() => {
                  setValidatedKey(null);
                  form.reset();
                  onKeyUpdated();
                }}
                size="sm"
                variant="default"
              >
                I've Updated the Secret
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Edge functions cannot directly update Supabase secrets for security reasons. 
          The manual update process ensures your API keys remain secure.
        </p>
      </div>
    </div>
  );
};
