
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
import { Key, Save, Eye, EyeOff } from 'lucide-react';

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

      toast.success('Suno API key updated successfully');
      form.reset();
      onKeyUpdated();
      
    } catch (error: any) {
      console.error('Error updating API key:', error);
      toast.error('Failed to update API key: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Update Suno API Key
        </CardTitle>
        <CardDescription>
          Enter your new Suno AI API key to update the configuration
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
                    Your API key will be stored securely in Supabase secrets
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
                {isSubmitting ? 'Updating...' : 'Update API Key'}
              </Button>
              
              <Button 
                type="button" 
                variant="outline"
                onClick={() => form.reset()}
                disabled={isSubmitting}
              >
                Clear
              </Button>
            </div>
          </form>
        </Form>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> After updating the API key, it may take a few moments for the changes to take effect. 
            You can use the "Test Generation" button to verify the new key is working.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
