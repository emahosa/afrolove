
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield } from 'lucide-react';
import { apiProviders } from './types';
import { ApiKey } from './types';

interface AddApiKeyDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: z.infer<typeof apiKeyFormSchema>) => void;
}

const apiKeyFormSchema = z.object({
  provider: z.string().min(1, { message: "Please select an API provider." }),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  key: z.string().min(10, { message: "API key must be at least 10 characters." }),
});

const AddApiKeyDialog = ({ isOpen, onOpenChange, onSubmit }: AddApiKeyDialogProps) => {
  const form = useForm<z.infer<typeof apiKeyFormSchema>>({
    resolver: zodResolver(apiKeyFormSchema),
    defaultValues: {
      provider: "",
      name: "",
      key: "",
    },
  });

  const handleSubmit = (values: z.infer<typeof apiKeyFormSchema>) => {
    onSubmit(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add External API Key</DialogTitle>
          <DialogDescription>
            Enter API keys from supported AI services to enable additional features.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Provider</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an API provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {apiProviders.map(provider => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name} - {provider.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Production Suno Key" />
                  </FormControl>
                  <FormDescription>
                    A friendly name to identify this API key
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" placeholder="Enter the API key from the provider" />
                  </FormControl>
                  <FormDescription>
                    {field.value && field.value.length > 0 ? (
                      <>
                        <Shield className="h-3 w-3 inline mr-1" />
                        API key will be securely stored and verified on submission
                      </>
                    ) : (
                      <>Get API keys from provider websites: 
                        <a href="https://www.suno.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">Suno</a>,
                        <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">ElevenLabs</a>, or
                        <a href="https://www.lalal.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">Lalal.ai</a>
                      </>
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Add and Verify Key</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddApiKeyDialog;
