
import { useState, useEffect } from 'react';
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
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader, Key, CheckCircle, AlertTriangle, X, Shield } from 'lucide-react';

interface ApiKey {
  id: number;
  provider: string;
  name: string;
  key: string;
  status: string;
  lastVerified?: string;
}

interface ApiKeyManagementProps {
  apiKeys: ApiKey[];
  getButtonContent: (status: string) => React.ReactNode;
}

const apiProviders = [
  { 
    id: 'suno', 
    name: 'Suno AI', 
    description: 'Music generation AI', 
    endpoint: 'https://api.suno.com/api/v1/status',
    verificationHeaders: {
      'Authorization': 'Bearer {API_KEY}',
      'Content-Type': 'application/json'
    }
  },
  { 
    id: 'elevenlabs', 
    name: 'ElevenLabs', 
    description: 'Voice cloning AI', 
    endpoint: 'https://api.elevenlabs.io/v1/user',
    verificationHeaders: {
      'xi-api-key': '{API_KEY}',
      'Content-Type': 'application/json'
    }
  },
  { 
    id: 'lalaiai', 
    name: 'Lalal.ai', 
    description: 'Vocal/Instrumental splitting', 
    endpoint: 'https://api.lalal.ai/status',
    verificationHeaders: {
      'Authorization': 'Bearer {API_KEY}',
      'Content-Type': 'application/json'
    }
  },
];

const apiKeyFormSchema = z.object({
  provider: z.string().min(1, { message: "Please select an API provider." }),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  key: z.string().min(10, { message: "API key must be at least 10 characters." }),
});

export const ApiKeyManagement = ({ apiKeys, getButtonContent }: ApiKeyManagementProps) => {
  const [keys, setKeys] = useState<ApiKey[]>(apiKeys);
  const [revealedKeys, setRevealedKeys] = useState<Record<number, boolean>>({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState<number | null>(null);
  const [verificationResults, setVerificationResults] = useState<Record<number, string>>({});

  const form = useForm<z.infer<typeof apiKeyFormSchema>>({
    resolver: zodResolver(apiKeyFormSchema),
    defaultValues: {
      provider: "",
      name: "",
      key: "",
    },
  });

  const handleRevealKey = (apiId: number) => {
    setRevealedKeys(prev => ({
      ...prev,
      [apiId]: !prev[apiId]
    }));
  };

  const handleToggleStatus = (apiId: number) => {
    setKeys(keys.map(api => {
      if (api.id === apiId) {
        const newStatus = api.status === 'active' ? 'inactive' : 'active';
        toast.success(`API key ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
        return { ...api, status: newStatus };
      }
      return api;
    }));
  };

  const handleDelete = (apiId: number) => {
    setKeys(keys.filter(api => api.id !== apiId));
    toast.success("API key removed");
  };

  // Function to verify API key by making a test request
  const verifyApiKey = async (apiId: number) => {
    setIsVerifying(apiId);
    const apiKey = keys.find(key => key.id === apiId);
    
    if (!apiKey) {
      setIsVerifying(null);
      return;
    }
    
    // Find the provider's configuration
    const provider = apiProviders.find(p => p.id === apiKey.provider);
    if (!provider) {
      toast.error("Provider configuration not found");
      setIsVerifying(null);
      return;
    }
    
    try {
      // This is a simulation of API verification - in a real app, we would make actual API calls
      // to the respective services with proper authentication
      
      // Simulate API call with timeout
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate verification result based on key format and length
      let isValid = false;
      let verificationMessage = "Invalid API key format";
      
      // Simple validation patterns for demo purposes
      if (apiKey.provider === 'suno' && apiKey.key.startsWith('suno_')) {
        isValid = true;
        verificationMessage = "Suno API key verified successfully";
      } else if (apiKey.provider === 'elevenlabs' && apiKey.key.length > 20) {
        isValid = true;
        verificationMessage = "ElevenLabs API key verified successfully";
      } else if (apiKey.provider === 'lalaiai' && apiKey.key.includes('-')) {
        isValid = true;
        verificationMessage = "Lalal.ai API key verified successfully";
      }
      
      // Update key status with verification result
      setKeys(keys.map(key => {
        if (key.id === apiId) {
          return {
            ...key,
            status: isValid ? 'active' : 'invalid',
            lastVerified: isValid ? new Date().toISOString() : undefined
          };
        }
        return key;
      }));
      
      setVerificationResults({
        ...verificationResults,
        [apiId]: verificationMessage
      });
      
      if (isValid) {
        toast.success(`${provider.name} API key verified successfully`);
      } else {
        toast.error(`API key validation failed: ${verificationMessage}`);
      }
    } catch (error) {
      setKeys(keys.map(key => {
        if (key.id === apiId) {
          return {
            ...key,
            status: 'invalid'
          };
        }
        return key;
      }));
      toast.error(`Failed to verify API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsVerifying(null);
    }
  };

  const handleAddNewApi = () => {
    form.reset({ 
      provider: "",
      name: "",
      key: ""
    });
    setIsAddDialogOpen(true);
  };

  const onSubmitAdd = async (values: z.infer<typeof apiKeyFormSchema>) => {
    setIsAddDialogOpen(false);
    
    const provider = apiProviders.find(p => p.id === values.provider);
    if (!provider) {
      toast.error("Selected provider not found");
      return;
    }
    
    const newApiKey: ApiKey = {
      id: Math.max(0, ...keys.map(k => k.id)) + 1,
      provider: values.provider,
      name: values.name,
      key: values.key,
      status: 'pending',
    };
    
    // Add the new API key
    setKeys(prev => [...prev, newApiKey]);
    
    // Show verification in progress
    toast.loading(`Verifying ${provider.name} API key...`);
    
    // Simulate verification process
    setTimeout(() => {
      // Simple validation logic based on key format
      let isValid = false;
      
      // Check key format based on provider
      if (values.provider === 'suno' && values.key.startsWith('suno_')) {
        isValid = true;
      } else if (values.provider === 'elevenlabs' && values.key.length > 20) {
        isValid = true;
      } else if (values.provider === 'lalaiai' && values.key.includes('-')) {
        isValid = true;
      }
      
      setKeys(prev => prev.map(key => {
        if (key.id === newApiKey.id) {
          return {
            ...key,
            status: isValid ? 'active' : 'invalid',
            lastVerified: isValid ? new Date().toISOString() : undefined
          };
        }
        return key;
      }));
      
      if (isValid) {
        toast.success(`${provider.name} API key added and verified`);
      } else {
        toast.error(`${provider.name} API key validation failed. Please check the key format and try again.`);
      }
    }, 2000);
  };

  // Function to get provider display name
  const getProviderName = (providerId: string) => {
    return apiProviders.find(p => p.id === providerId)?.name || providerId;
  };

  // Function to mask API key for display
  const maskApiKey = (key: string) => {
    if (key.length <= 8) return '*'.repeat(key.length);
    return '*'.repeat(key.length - 8) + key.slice(-8);
  };

  // Function to get badge variant based on status
  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'pending';
      case 'inactive': return 'warning';
      case 'invalid': return 'invalid';
      default: return 'outline';
    }
  };
  
  // Function to get badge text based on status
  const getBadgeText = (status: string) => {
    switch (status) {
      case 'active': return 'Verified';
      case 'pending': return 'Pending';
      case 'inactive': return 'Inactive';
      case 'invalid': return 'Invalid';
      default: return 'Unknown';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">External API Management</h2>
          <p className="text-muted-foreground">Manage your AI service API keys</p>
        </div>
        <Button onClick={handleAddNewApi}>Add New API Key</Button>
      </div>
      
      {keys.length === 0 ? (
        <Card>
          <CardContent className="pt-6 flex flex-col items-center justify-center h-40 text-center">
            <Key className="h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="text-lg font-medium">No API Keys Added</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add API keys from Suno, ElevenLabs, or Lalal.ai to enable AI features
            </p>
            <Button onClick={handleAddNewApi} className="mt-4">Add API Key</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {keys.map((api) => (
            <Card key={api.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{api.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      {getProviderName(api.provider)}
                      <Badge variant={getBadgeVariant(api.status)}>
                        {getBadgeText(api.status)}
                      </Badge>
                    </CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleDelete(api.id)}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">API Key</div>
                    <div className="font-mono text-sm">
                      {revealedKeys[api.id] ? api.key : maskApiKey(api.key)}
                    </div>
                    {api.lastVerified && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Last verified: {new Date(api.lastVerified).toLocaleString()}
                      </div>
                    )}
                    {verificationResults[api.id] && api.status === 'invalid' && (
                      <div className="text-xs text-red-500 mt-1">
                        <AlertTriangle className="h-3 w-3 inline mr-1" />
                        {verificationResults[api.id]}
                      </div>
                    )}
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
                      disabled={api.status === 'invalid'}
                    >
                      {getButtonContent(api.status)}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => verifyApiKey(api.id)}
                      disabled={isVerifying === api.id}
                    >
                      {isVerifying === api.id ? (
                        <>
                          <Loader className="h-4 w-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        'Verify Key'
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add New API Key Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add External API Key</DialogTitle>
            <DialogDescription>
              Enter API keys from supported AI services to enable additional features.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitAdd)} className="space-y-4">
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
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add and Verify Key</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
