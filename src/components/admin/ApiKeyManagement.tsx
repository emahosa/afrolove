
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
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
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

interface ApiKey {
  id: number;
  name: string;
  key: string;
  status: string;
}

interface ApiKeyManagementProps {
  apiKeys: ApiKey[];
  getButtonContent: (status: string) => React.ReactNode;
}

const apiKeyFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
});

export const ApiKeyManagement = ({ apiKeys, getButtonContent }: ApiKeyManagementProps) => {
  const [keys, setKeys] = useState<ApiKey[]>(apiKeys);
  const [revealedKeys, setRevealedKeys] = useState<Record<number, boolean>>({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof apiKeyFormSchema>>({
    resolver: zodResolver(apiKeyFormSchema),
    defaultValues: {
      name: "",
    },
  });

  const handleRevealKey = (apiId: number) => {
    setRevealedKeys(prev => ({
      ...prev,
      [apiId]: !prev[apiId]
    }));
    toast.info(`Key visibility toggled`);
  };

  const handleToggleStatus = (apiId: number) => {
    setKeys(keys.map(api => {
      if (api.id === apiId) {
        const newStatus = api.status === 'active' ? 'inactive' : 'active';
        toast.success(`API key status changed to ${newStatus}`);
        return { ...api, status: newStatus };
      }
      return api;
    }));
  };

  const handleRegenerate = (apiId: number) => {
    toast.success(`API key regenerated`);
    // In a real app, this would regenerate the key
  };

  const handleAddNewApi = () => {
    form.reset({ name: "" });
    setIsAddDialogOpen(true);
  };

  const onSubmitAdd = (values: z.infer<typeof apiKeyFormSchema>) => {
    // Generate a random key for demo purposes
    const randomKey = "sk_live_" + Math.random().toString(36).substring(2, 10);
    
    const newApiKey: ApiKey = {
      id: Math.max(0, ...keys.map(k => k.id)) + 1,
      name: values.name,
      key: "******************************" + randomKey.substring(randomKey.length - 4),
      status: "active"
    };
    
    setKeys([...keys, newApiKey]);
    toast.success("New API key added successfully");
    setIsAddDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">API Key Management</h2>
        <Button onClick={handleAddNewApi}>Add New API</Button>
      </div>
      <div className="grid gap-4">
        {keys.map((api) => (
          <Card key={api.id}>
            <CardHeader className="pb-2">
              <CardTitle>{api.name}</CardTitle>
              <CardDescription>API Integration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">API Key</div>
                  <div className="font-mono text-sm">
                    {revealedKeys[api.id] 
                      ? api.key.replace('*****', 'sk_live_abcdefgh12345') 
                      : api.key}
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleRevealKey(api.id)}
                  >
                    {revealedKeys[api.id] ? 'Hide Key' : 'Reveal Key'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className={api.status === "active" ? "text-green-500" : "text-muted-foreground"}
                    onClick={() => handleToggleStatus(api.id)}
                  >
                    {getButtonContent(api.status)}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleRegenerate(api.id)}
                  >
                    Regenerate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add New API Key Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for service integration.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitAdd)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. AI Music Generation" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Generate Key</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
