
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as z from 'zod';
import { ApiKey } from './api-keys/types';
import { apiProviders } from './api-keys/types';
import ApiKeyItem from './api-keys/ApiKeyItem';
import AddApiKeyDialog from './api-keys/AddApiKeyDialog';
import EmptyApiKeyState from './api-keys/EmptyApiKeyState';

interface ApiKeyManagementProps {
  apiKeys: ApiKey[];
  getButtonContent: (status: string) => React.ReactNode;
}

export const ApiKeyManagement = ({ apiKeys, getButtonContent }: ApiKeyManagementProps) => {
  const [keys, setKeys] = useState<ApiKey[]>(apiKeys);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState<number | null>(null);
  const [verificationResults, setVerificationResults] = useState<Record<number, string>>({});
  const [revealedKeys, setRevealedKeys] = useState<Record<number, boolean>>({});

  const handleAddNewApi = () => {
    setIsAddDialogOpen(true);
  };

  const handleDelete = (apiId: number) => {
    setKeys(keys.filter(api => api.id !== apiId));
    toast.success("API key removed");
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

  const apiKeyFormSchema = z.object({
    provider: z.string().min(1, { message: "Please select an API provider." }),
    name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    key: z.string().min(10, { message: "API key must be at least 10 characters." }),
  });

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
        <EmptyApiKeyState onAddNewClick={handleAddNewApi} />
      ) : (
        <div className="grid gap-4">
          {keys.map((api) => (
            <ApiKeyItem 
              key={api.id}
              api={api}
              getButtonContent={getButtonContent}
              handleDelete={handleDelete}
              verificationResults={verificationResults}
              keys={keys}
              setKeys={setKeys}
              setVerificationResults={setVerificationResults}
              isVerifying={isVerifying}
              setIsVerifying={setIsVerifying}
            />
          ))}
        </div>
      )}

      <AddApiKeyDialog 
        isOpen={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen}
        onSubmit={onSubmitAdd}
      />
    </div>
  );
};
